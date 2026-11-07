#!/usr/bin/env node
/**
 * fb-storage-pull.mjs — Descarga los objetos de un bucket de Firebase Storage
 * usando las credenciales del Firebase CLI (sin gcloud ni service account).
 *
 * Uso:
 *   node tools/fb-storage-pull.mjs --bucket=gymbarsgt.appspot.com --out=./tmp/images
 *
 * Requisitos:
 *   - `firebase login` hecho (usa ~/.config/configstore/firebase-tools.json)
 *   - El proyecto dueño del bucket con facturación activa; si no, Cloud Storage
 *     responde: 403 "The billing account for the owning project is disabled".
 *
 * Salida:
 *   <out>/...            archivos descargados conservando prefijos (carousel/…)
 *   <out>/manifest.json  { nombre, bytes, archivo, contentType }
 *
 * Después de descargar, subir la carpeta a Google Drive y registrar las URLs
 * en la pestaña "Imágenes" (ver code/README.md).
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const FIREBASE_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, '').split('=');
      return [key, rest.join('=') || true];
    })
);

const bucket = args.bucket || 'gymbarsgt.appspot.com';
const outDir = path.resolve(args.out || 'tmp/firebase-images');

function readRefreshToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('No se encontró ' + configPath + '. Ejecutá "firebase login" primero.');
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const token = config?.tokens?.refresh_token;
  if (!token) throw new Error('El archivo de configuración no tiene refresh_token.');
  return token;
}

async function getAccessToken() {
  if (process.env.FIREBASE_ACCESS_TOKEN) return process.env.FIREBASE_ACCESS_TOKEN;

  const body = new URLSearchParams({
    client_id: FIREBASE_CLIENT_ID,
    client_secret: FIREBASE_CLIENT_SECRET,
    refresh_token: readRefreshToken(),
    grant_type: 'refresh_token'
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const json = await res.json();
  if (!json.access_token) throw new Error('No se pudo obtener access_token: ' + JSON.stringify(json));
  return json.access_token;
}

async function listObjects(token) {
  const objects = [];
  let pageToken = '';

  do {
    const url = new URL(`https://storage.googleapis.com/storage/v1/b/${bucket}/o`);
    url.searchParams.set('maxResults', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    const json = await res.json();
    if (!res.ok) throw new Error('Listado falló (' + res.status + '): ' + JSON.stringify(json));

    objects.push(...(json.items || []));
    pageToken = json.nextPageToken || '';
  } while (pageToken);

  return objects;
}

async function downloadObject(token, object) {
  const url = `https://storage.googleapis.com/download/storage/v1/b/${bucket}/o/${encodeURIComponent(object.name)}?alt=media`;
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} — ${text.slice(0, 200)}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const dest = path.join(outDir, object.name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buffer);
  return { name: object.name, bytes: buffer.length, file: dest, contentType: object.contentType };
}

async function main() {
  const token = await getAccessToken();
  const objects = (await listObjects(token)).filter((object) => Number(object.size) > 0);

  console.log(`Bucket ${bucket}: ${objects.length} objetos`);
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = [];
  let failed = 0;

  for (const object of objects) {
    try {
      const entry = await downloadObject(token, object);
      manifest.push(entry);
      console.log(`  ✓ ${entry.bytes.toString().padStart(9)}  ${entry.name}`);
    } catch (error) {
      failed++;
      console.error(`  ✗ ${object.name}: ${error.message}`);
    }
  }

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n${manifest.length} descargados, ${failed} fallidos → ${outDir}`);

  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});

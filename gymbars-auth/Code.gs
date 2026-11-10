/**
 * Gymbars — Google Sign-In companion web app.
 *
 * Proyecto Apps Script independiente. Su único propósito es obtener el correo
 * de Google de la persona que visita la web y entregarlo al panel de Gymbars
 * de forma verificada criptográficamente (HMAC-SHA256).
 *
 * Configuración de implementación (OBLIGATORIA):
 *   Ejecutar como:    El usuario que accede a la aplicación web (USER_ACCESSING)
 *   Quién tiene acceso: Cualquier usuario (ANYONE)
 *
 * Scopes: únicamente `userinfo.email` (no muestra advertencias de apps no verificadas).
 */

// URL principal del Web App de Gymbars
var MAIN_APP_URL = 'https://script.google.com/macros/s/AKfycbwJpwx7cUynhoeTQsBbdCUHKvCgS_1O1Q0YD9G4-XT8QFRPu2weyPgxwZW5HKKW9z-3KQ/exec';

// Clave compartida con Code.gs / ConfigPanelService.gs de Gymbars
var SHARED_SECRET = '38a01d228ceae777bba05516096f9e2f24131f0f5c7d42f00b03aeb00c6aff1c';

var AUTH_TTL_MS = 2 * 60 * 1000;

function doGet(e) {
  var nonce = (e && e.parameter && e.parameter.nonce) || '';
  var customCallback = (e && e.parameter && e.parameter.callback) || '';
  var targetBase = (customCallback && customCallback.indexOf('https://script.google.com/macros/s/') === 0)
    ? customCallback
    : MAIN_APP_URL;

  var email = '';
  try {
    email = Session.getActiveUser().getEmail() || '';
  } catch (err) {
    email = '';
  }
  email = String(email).trim().toLowerCase();

  if (!email) {
    return page_(
      'No se pudo obtener tu cuenta de Google',
      'Vuelve a intentarlo desde Gymbars y asegúrate de haber iniciado sesión con tu cuenta de Google.',
      true
    );
  }

  if (!nonce || nonce.length < 16 || nonce.length > 80) {
    return page_(
      'Solicitud inválida',
      'Abre esta ventana desde el botón "Continuar con Google" en Gymbars.',
      true
    );
  }

  try {
    var expiry = Date.now() + AUTH_TTL_MS;
    var payload = b64url_(email + '|' + nonce + '|' + expiry);
    var sig = b64url_(Utilities.computeHmacSha256Signature(payload, SHARED_SECRET));
    var url = targetBase +
      (targetBase.indexOf('?') === -1 ? '?' : '&') +
      'googleAuth=' + encodeURIComponent(payload) +
      '&sig=' + encodeURIComponent(sig) +
      '&nonce=' + encodeURIComponent(nonce);

    return redirectPage_(url, nonce);
  } catch (err) {
    return page_(
      'Error al iniciar sesión',
      String((err && err.message) || err),
      true
    );
  }
}

/** Base64 URL-safe without padding. */
function b64url_(data) {
  return Utilities.base64EncodeWebSafe(data).replace(/=+$/, '');
}

/**
 * Entrega la URL firmada a la pestaña de Gymbars que abrió esta ventana emergente.
 */
function redirectPage_(url, nonce) {
  var html =
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Gymbars</title>' +
    '<style>' +
    ':root{color-scheme:dark}' +
    'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
    'background:#0B0F19;color:#f3f4f6;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.card{width:min(420px,92vw);text-align:center;padding:32px;background:#151D2A;border-radius:16px;border:1px solid rgba(255,255,255,0.1)}' +
    '.spinner{width:38px;height:38px;margin:0 auto 18px;border-radius:50%;' +
    'border:3.5px solid rgba(255,255,255,0.15);border-top-color:#60A5FA;animation:spin .8s linear infinite}' +
    '@keyframes spin{to{transform:rotate(360deg)}}' +
    'h1{font-size:20px;margin:0 0 8px;font-weight:700}p{color:#94A3B8;font-size:14px;margin:0}' +
    'a.btn{display:block;margin-top:22px;border-radius:10px;text-decoration:none;' +
    'padding:13px 18px;background:#2563EB;color:#ffffff;font-weight:700;font-size:14px}' +
    '</style></head><body>' +
    '<div class="card">' +
    '<div class="spinner" id="spinner"></div>' +
    '<h1>¡Listo!</h1>' +
    '<p id="msg">Pulsa Continuar para terminar de iniciar sesión en Gymbars.</p>' +
    '<a class="btn" id="go" href="' + escapeHtml_(url) + '" target="_top">Continuar</a>' +
    '</div>' +
    '<script>' +
    'var target=' + JSON.stringify(url) + ';' +
    'try{window.top.location.href=target;}catch(e){}' +
    'setTimeout(function(){document.getElementById("spinner").style.display="none";},1500);' +
    '<\/script></body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle('Gymbars')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function page_(title, message, isError, email) {
  var safeTitle = escapeHtml_(title);
  var safeMessage = escapeHtml_(message);
  var safeEmail = escapeHtml_(email || '');

  var html =
    '<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + safeTitle + '</title>' +
    '<style>' +
    ':root{color-scheme:dark}' +
    'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
    'background:#0B0F19;color:#f3f4f6;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.card{width:min(420px,92vw);background:#151D2A;border:1px solid rgba(255,255,255,0.1);border-radius:18px;' +
    'padding:32px 28px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.4)}' +
    '.icon{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
    'margin:0 auto 18px;font-size:30px;font-weight:800}' +
    '.icon.ok{background:rgba(37,211,102,.15);color:#25d366;border:1px solid rgba(37,211,102,.35)}' +
    '.icon.err{background:rgba(239,68,68,.15);color:#ef4444;border:1px solid rgba(239,68,68,.35)}' +
    'h1{font-size:20px;margin:0 0 10px}p{color:#94A3B8;font-size:14px;line-height:1.55;margin:0}' +
    '.email{margin-top:14px;color:#60A5FA;font-weight:600;word-break:break-all}' +
    'button{margin-top:24px;width:100%;border:0;border-radius:10px;padding:13px 18px;cursor:pointer;' +
    'background:#2563EB;color:#ffffff;font-weight:700;font-size:14px}' +
    'button:hover{filter:brightness(1.08)}' +
    '</style></head><body>' +
    '<div class="card">' +
    '<div class="icon ' + (isError ? 'err' : 'ok') + '">' + (isError ? '!' : '&#10003;') + '</div>' +
    '<h1>' + safeTitle + '</h1>' +
    '<p>' + safeMessage + '</p>' +
    (safeEmail ? '<p class="email">' + safeEmail + '</p>' : '') +
    '<button type="button" onclick="try{window.top.close()}catch(e){try{window.close()}catch(e2){}}">Cerrar ventana</button>' +
    '</div>' +
    (isError ? '' : '<script>setTimeout(function(){try{window.top.close()}catch(e){}},1600);<\/script>') +
    '</body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle(title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

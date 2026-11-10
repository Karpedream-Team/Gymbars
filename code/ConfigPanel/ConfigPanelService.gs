/**
 * ConfigPanelService.gs — Backend del panel de administración de Gymbars.
 *
 * El panel vive dentro de la hoja de cálculo (menú Gymbars → Abrir panel), así
 * que sólo alguien con acceso de edición a la hoja puede abrirlo. Todas las
 * escrituras pasan por estas funciones: la hoja sigue siendo la base de datos.
 *
 * Convención: las funciones públicas del panel empiezan con `cp` para no
 * chocar con las del sitio (`getWebsiteData`, `readSite_`, …).
 */

/** Carpeta de Drive donde viven las imágenes del sitio. */
var CP_IMAGE_FOLDER_ID = '122q4COt2Sq-Fs0Gohwqf4m7ly3r_9KqL';

/** Nombre de la propiedad del script que puede sobreescribir la carpeta. */
var CP_FOLDER_PROPERTY = 'GYMBARS_IMAGE_FOLDER_ID';

/** Encabezados por pestaña (una sola fuente de verdad). */
var CP_HEADERS_ = {
  site: ['Clave', 'Valor'],
  images: ['Referencia', 'URL', 'Posición', 'ArchivoDrive', 'Ajuste'],
  carousel: ['Título', 'Descripción', 'Imagen', 'Orden'],
  features: ['Título', 'Descripción', 'Imagen', 'Orden'],
  programs: ['Título', 'Imagen', 'Orden'],
  programDetail: ['Programa', 'Tipo', 'Orden', 'Texto'],
  schedule: ['Día', 'Turno', 'Horario', 'Color', 'Orden'],
  social: ['Nombre', 'Icono', 'URL', 'Orden'],
  log: ['Fecha', 'Tipo de evento', 'Estado', 'JSON']
};

/**
 * Campos de la pestaña "Sitio", agrupados para el formulario del panel.
 * El panel los usa para pintar etiquetas, ayudas y controles adecuados
 * (color, URL, teléfono, fuente…). Si la hoja tiene claves que no están aquí,
 * el panel las muestra igualmente en el grupo "Otras claves".
 */
var CP_SITE_GROUPS_ = [
  {
    id: 'general',
    title: 'Identidad del sitio',
    description: 'Cómo se llama el gimnasio y qué ve la gente en Google.',
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Gymbars' },
      { key: 'lema', label: 'Lema de portada', type: 'textarea', rows: 3, wide: true },
      { key: 'tituloSEO', label: 'Título para Google', type: 'text', wide: true },
      { key: 'descripcionSEO', label: 'Descripción para Google', type: 'textarea', rows: 2, wide: true, help: 'Ideal entre 120 y 160 caracteres.' },
      { key: 'tipografia', label: 'Tipografía', type: 'font', help: 'Cualquier fuente de Google Fonts; por ejemplo Roboto, Inter o Poppins.' },
      { key: 'dominio', label: 'Dominio propio', type: 'url', placeholder: 'https://gymbarsgt.com', help: 'Opcional. Sólo si el sitio se publica con dominio propio.' }
    ]
  },
  {
    id: 'contacto',
    title: 'Contacto y ubicación',
    description: 'Estos datos alimentan la tarjeta de contacto, los botones de llamada y el mapa.',
    fields: [
      { key: 'telefono', label: 'Teléfono visible', type: 'tel', placeholder: '4799-3217' },
      { key: 'whatsapp', label: 'WhatsApp', type: 'tel', placeholder: '50247993217', help: 'Con código de país y sin espacios. Ej. 50247993217.' },
      { key: 'direccion1', label: 'Dirección, línea 1', type: 'text', wide: true },
      { key: 'direccion2', label: 'Dirección, línea 2', type: 'text', wide: true },
      { key: 'direccion3', label: 'Dirección, línea 3', type: 'text', wide: true },
      { key: 'mapaUrl', label: 'Mapa incrustado', type: 'url', wide: true, help: 'Enlace que termina en /maps/d/embed?mid=…' },
      { key: 'mapaEnlace', label: 'Enlace «Abrir en Google Maps»', type: 'url', wide: true }
    ]
  },
  {
    id: 'redes',
    title: 'Redes sociales',
    description: 'Aparecen en la barra superior, la tarjeta de contacto y el pie de página.',
    fields: [
      { key: 'facebook', label: 'Facebook', type: 'url', wide: true, placeholder: 'https://www.facebook.com/…' },
      { key: 'instagram', label: 'Instagram', type: 'url', wide: true, placeholder: 'https://www.instagram.com/…' },
      { key: 'messenger', label: 'Messenger', type: 'url', wide: true, placeholder: 'https://m.me/…' }
    ]
  },
  {
    id: 'colores',
    title: 'Colores',
    description: 'Se aplican a todo el sitio sin tocar código. Haz clic en el cuadro para cambiarlos.',
    fields: [
      { key: 'colorNavbar', label: 'Barra de navegación', type: 'color' },
      { key: 'colorFondo', label: 'Fondo del sitio', type: 'color' },
      { key: 'colorSeccion', label: 'Fondo de secciones', type: 'color' },
      { key: 'colorTexto', label: 'Texto principal', type: 'color' },
      { key: 'colorTextoClaro', label: 'Texto sobre fondo oscuro', type: 'color' },
      { key: 'colorAcento', label: 'Acento (días de semana)', type: 'color' },
      { key: 'colorSabado', label: 'Sábado', type: 'color' },
      { key: 'colorDomingo', label: 'Domingo', type: 'color' },
      { key: 'colorContacto', label: 'Tarjeta de contacto', type: 'color' }
    ]
  },
  {
    id: 'secciones',
    title: 'Títulos de sección',
    description: 'Los encabezados que separan cada parte de la portada.',
    fields: [
      { key: 'horarioTitulo', label: 'Horario', type: 'text' },
      { key: 'contactoTitulo', label: 'Contacto', type: 'text' },
      { key: 'programasTitulo', label: 'Rutinas', type: 'text' },
      { key: 'ubicacionTitulo', label: 'Ubicación', type: 'text' }
    ]
  },
  {
    id: 'pie',
    title: 'Pie de página',
    fields: [
      { key: 'copyright', label: 'Copyright', type: 'text', wide: true },
      { key: 'licencia', label: 'Licencia', type: 'text', wide: true }
    ]
  }
];


// ============================================================
// ===  Abrir el panel  =======================================
// ============================================================
// ===  Autenticación y Permisos del Panel Web               ===
// ============================================================

/**
 * Comprueba si un correo de Google tiene acceso a la hoja de cálculo
 * (como propietario, editor o lector).
 *
 * @param {string} email
 * @return {boolean}
 */
function cpIsEmailAuthorizedForSheet(email) {
  if (!email) return false;
  var target = String(email).trim().toLowerCase();
  if (!target) return false;

  try {
    var ss = cpSpreadsheet_();
    if (!ss) return false;

    // 1. Propietario de la hoja
    try {
      var owner = ss.getOwner();
      if (owner && owner.getEmail() && owner.getEmail().trim().toLowerCase() === target) {
        return true;
      }
    } catch (e1) {
      log_('cpIsEmailAuthorized', 'WARN', 'ss.getOwner: ' + e1.toString());
    }

    // 2. Editores de la hoja
    try {
      var editors = ss.getEditors();
      for (var i = 0; i < editors.length; i++) {
        var ed = editors[i].getEmail();
        if (ed && ed.trim().toLowerCase() === target) return true;
      }
    } catch (e2) {
      log_('cpIsEmailAuthorized', 'WARN', 'ss.getEditors: ' + e2.toString());
    }

    // 3. Lectores de la hoja
    try {
      var viewers = ss.getViewers();
      for (var j = 0; j < viewers.length; j++) {
        var vw = viewers[j].getEmail();
        if (vw && vw.trim().toLowerCase() === target) return true;
      }
    } catch (e3) {
      log_('cpIsEmailAuthorized', 'WARN', 'ss.getViewers: ' + e3.toString());
    }

    // 4. Permisos directos en DriveApp
    try {
      var file = DriveApp.getFileById(ss.getId());
      if (file) {
        var fOwner = file.getOwner();
        if (fOwner && fOwner.getEmail() && fOwner.getEmail().trim().toLowerCase() === target) return true;

        var fEds = file.getEditors();
        for (var k = 0; k < fEds.length; k++) {
          if (fEds[k].getEmail() && fEds[k].getEmail().trim().toLowerCase() === target) return true;
        }

        var fVws = file.getViewers();
        for (var l = 0; l < fVws.length; l++) {
          if (fVws[l].getEmail() && fVws[l].getEmail().trim().toLowerCase() === target) return true;
        }

        var access = file.getAccess(target);
        if (access === DriveApp.Permission.OWNER ||
            access === DriveApp.Permission.EDIT ||
            access === DriveApp.Permission.VIEW ||
            access === DriveApp.Permission.COMMENT) {
          return true;
        }
      }
    } catch (e4) {}

  } catch (err) {
    log_('cpIsEmailAuthorized', 'ERROR', err.toString());
  }

  return false;
}

/**
 * Valida si el usuario actual o token tiene acceso administrativo.
 *
 * @param {string} [token]
 * @return {Object}
 */
function cpVerifyAdminAccess(token) {
  // 1. Si Session.getActiveUser() está disponible
  try {
    var activeEmail = Session.getActiveUser().getEmail();
    if (activeEmail && cpIsEmailAuthorizedForSheet(activeEmail)) {
      return {
        success: true,
        authorized: true,
        email: activeEmail.trim().toLowerCase(),
        method: 'activeUser'
      };
    }
  } catch (_) {}

  // 2. Token de sesión (generado con Google Sign-In)
  if (!token) {
    return {
      success: true,
      authorized: false,
      needLogin: true,
      error: 'Inicia sesión con tu cuenta de Google.'
    };
  }

  var raw = PropertiesService.getScriptProperties().getProperty('CP_SESSION_' + token);
  if (!raw) {
    return {
      success: true,
      authorized: false,
      needLogin: true,
      error: 'Sesión expirada o no válida. Inicia sesión con Google.'
    };
  }

  try {
    var s = JSON.parse(raw);
    if (Date.now() > s.expiry) {
      PropertiesService.getScriptProperties().deleteProperty('CP_SESSION_' + token);
      return {
        success: true,
        authorized: false,
        needLogin: true,
        error: 'Sesión expirada.'
      };
    }

    var email = String(s.email || '').trim().toLowerCase();
    if (cpIsEmailAuthorizedForSheet(email)) {
      return {
        success: true,
        authorized: true,
        email: email,
        method: 'session'
      };
    }

    return {
      success: true,
      authorized: false,
      unauthorized: true,
      email: email,
      error: 'La cuenta ' + email + ' no tiene permisos en la hoja de cálculo de Google. Solicita al propietario que comparta el Google Sheet con tu correo.'
    };
  } catch (e) {
    return {
      success: true,
      authorized: false,
      needLogin: true,
      error: 'Error al validar sesión.'
    };
  }
}

/** Base64 URL-safe without padding. */
function cpB64url_(data) {
  return Utilities.base64EncodeWebSafe(data).replace(/=+$/, '');
}

/** Safe equals comparison. */
function cpSafeEquals_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cpCompleteGoogleAuth_(payload, signature, nonce) {
  var cache = CacheService.getScriptCache();
  function fail(message) {
    if (nonce && /^[A-Za-z0-9-]{16,80}$/.test(nonce)) {
      try {
        cache.put('CP_GOOGLE_AUTH_RESULT_' + nonce,
          JSON.stringify({ success: false, error: message, ts: Date.now() }), 300);
      } catch (_) {}
    }
    return { ok: false, success: false, error: message };
  }

  try {
    if (!payload || !signature || !nonce) return fail('Solicitud inválida');
    if (!/^[A-Za-z0-9-]{16,80}$/.test(nonce)) return fail('Solicitud inválida');

    var expected = cpB64url_(Utilities.computeHmacSha256Signature(payload, GOOGLE_AUTH_SHARED_SECRET));
    if (!cpSafeEquals_(expected, String(signature))) return fail('Firma inválida');

    var decoded = Utilities.newBlob(Utilities.base64DecodeWebSafe(payload)).getDataAsString();
    var parts = decoded.split('|');
    if (parts.length !== 3) return fail('Solicitud inválida');

    var email = String(parts[0] || '').trim().toLowerCase();
    var payloadNonce = String(parts[1] || '');
    var expiry = parseInt(parts[2], 10);

    if (payloadNonce !== nonce) return fail('Solicitud inválida');
    if (!expiry || Date.now() > expiry) return fail('La verificación expiró, intenta de nuevo');

    var usedKey = 'CP_GOOGLE_AUTH_USED_' + nonce;
    if (cache.get(usedKey)) return fail('Esta verificación ya fue utilizada');
    cache.put(usedKey, '1', 600);

    var token = Utilities.getUuid();
    var sessionExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
    PropertiesService.getScriptProperties().setProperty('CP_SESSION_' + token, JSON.stringify({
      email: email,
      expiry: sessionExpiry,
      isGoogleAuth: true
    }));

    cache.put('CP_GOOGLE_AUTH_RESULT_' + nonce, JSON.stringify({
      success: true, token: token, email: email, ts: Date.now()
    }), 300);

    return { ok: true, success: true };
  } catch (err) {
    return fail('Error al verificar la cuenta: ' + (err && err.message ? err.message : err));
  }
}

function cpGetGoogleAuthResult(nonce) {
  nonce = String(nonce || '');
  if (!/^[A-Za-z0-9-]{16,80}$/.test(nonce)) {
    return { status: 'error', success: false, error: 'Solicitud inválida' };
  }

  var cache = CacheService.getScriptCache();
  var key = 'CP_GOOGLE_AUTH_RESULT_' + nonce;
  var raw = cache.get(key);
  if (!raw) return { status: 'pending' };

  cache.remove(key);
  try {
    var result = JSON.parse(raw);
    return {
      status: 'ok', success: !!result.success,
      token: result.token || '', email: result.email || '', error: result.error || ''
    };
  } catch (e) {
    return { status: 'error', success: false, error: 'No se pudo leer la sesión' };
  }
}

function cpGoogleAuthResultPage_(result) {
  var ok = !!(result && result.ok);
  var message = ok
    ? 'Tu cuenta de Google fue verificada. Vuelve a la ventana de administración; esta ventana se cerrará automáticamente.'
    : String((result && result.error) || 'No se pudo iniciar sesión. Vuelve a intentarlo.');

  var html =
    '<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + (ok ? 'Sesión iniciada' : 'Error al verificar cuenta') + '</title>' +
    '<style>' +
    ':root{color-scheme:dark}' +
    'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
    'background:#121212;color:#f3f4f6;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}' +
    '.card{width:min(420px,92vw);background:#1e1e1e;border:1px solid #2d2d2d;border-radius:18px;' +
    'padding:32px 28px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.35)}' +
    '.icon{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
    'margin:0 auto 18px;font-size:30px;font-weight:800}' +
    '.icon.ok{background:rgba(37,211,102,.15);color:#25d366;border:1px solid rgba(37,211,102,.35)}' +
    '.icon.err{background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.35)}' +
    'h1{font-size:20px;margin:0 0 10px}p{color:#9ca3af;font-size:14px;line-height:1.55;margin:0}' +
    'button{margin-top:24px;width:100%;border:0;border-radius:12px;padding:13px 18px;cursor:pointer;' +
    'background:#0E0E53;color:#fff;font-weight:700;font-size:14px}' +
    '</style></head><body>' +
    '<div class="card">' +
    '<div class="icon ' + (ok ? 'ok' : 'err') + '">' + (ok ? '&#10003;' : '!') + '</div>' +
    '<h1>' + (ok ? '¡Listo!' : 'Error al verificar cuenta') + '</h1>' +
    '<p>' + message.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>' +
    '<button type="button" onclick="try{window.top.close()}catch(e){try{window.close()}catch(e2){}}">Cerrar ventana</button>' +
    '</div>' +
    (ok ? '<script>setTimeout(function(){try{window.top.close()}catch(e){}},1600);<\/script>' : '') +
    '</body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle(ok ? 'Sesión iniciada' : 'Error al verificar cuenta')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function cpLogoutAdmin(token) {
  if (token) PropertiesService.getScriptProperties().deleteProperty('CP_SESSION_' + token);
  return { success: true };
}

/**
 * Menú / función para abrir el panel dentro de la hoja.
 * @param {string} [activeTab] Pestaña inicial: sitio, imagenes, carrusel…
 */
function showAdminPanel(activeTab) {
  var template = HtmlService.createTemplateFromFile('ConfigPanel/ConfigPanel');
  template.activeTab = activeTab || 'sitio';
  template.webAppUrl = cpSafeWebsiteUrl_();
  template.isWebApp = false;
  template.googleAuthStartUrl = GOOGLE_AUTH_START_URL;

  var html = template.evaluate()
    .setWidth(1240)
    .setHeight(860);

  SpreadsheetApp.getUi().showModalDialog(html, 'Panel de Gymbars');
}

function cpSafeWebsiteUrl_() {
  try { return getWebsiteUrl() || ''; } catch (_) { return ''; }
}


// ============================================================
// ===  Lectura para el panel  ================================
// ============================================================

/**
 * Devuelve todo lo que el panel necesita para pintarse.
 * No usa la caché del sitio: el panel siempre trabaja con la hoja real.
 *
 * @return {Object}
 */
function cpGetData() {
  var sheet = cpSpreadsheet_();

  var data = {
    site: cpReadSiteRows_(),
    siteGroups: CP_SITE_GROUPS_,
    images: cpReadImages_(),
    imageUsage: cpImagesUsage_(),
    carousel: cpReadCarousel_(),
    features: cpReadFeatures_(),
    programs: cpReadPrograms_(),
    schedule: cpReadSchedule_(),
    social: cpReadSocial_(),
    log: cpReadLog_(),
    system: {
      webUrl: cpSafeWebsiteUrl_(),
      sheetUrl: sheet.getUrl(),
      sheetName: sheet.getName(),
      folder: cpFolderInfo_(),
      timeZone: Session.getScriptTimeZone(),
      tabs: cpTabStatus_()
    }
  };

  return data;
}

/**
 * Filas crudas de "Sitio", en el orden de la hoja.
 * @return {Array<{key: string, value: string}>}
 */
function cpReadSiteRows_() {
  var rows = [];
  cpRows_(SHEETS.site).forEach(function (row) {
    var key = cpText_(row[0]);
    if (!key) return;
    rows.push({ key: key, value: cpText_(row[1]) });
  });
  return rows;
}

/**
 * Imágenes con su miniatura ya resuelta.
 * @return {Array<Object>}
 */
function cpReadImages_() {
  var images = [];
  cpRows_(SHEETS.images).forEach(function (row) {
    var ref = cpText_(row[0]);
    if (!ref) return;
    var url = cpText_(row[1]);
    images.push({
      ref: ref,
      url: url,
      pos: normalizePosValue_(row[2]),
      source: cpText_(row[3]),
      fit: normalizeFitValue_(row[4]),
      thumb: convertImageUrl(url)
    });
  });
  return images;
}

/** @return {Array<Object>} */
function cpReadCarousel_() {
  var items = [];
  cpRows_(SHEETS.carousel).forEach(function (row) {
    if (!cpText_(row[0]) && !cpText_(row[1]) && !cpText_(row[2])) return;
    items.push({
      title: cpText_(row[0]),
      description: cpText_(row[1]),
      image: cpText_(row[2])
    });
  });
  return items;
}

/** @return {Array<Object>} */
function cpReadFeatures_() {
  var items = [];
  cpRows_(SHEETS.features).forEach(function (row) {
    if (!cpText_(row[0]) && !cpText_(row[1]) && !cpText_(row[2])) return;
    items.push({
      title: cpText_(row[0]),
      description: cpText_(row[1]),
      image: cpText_(row[2])
    });
  });
  return items;
}

/** @return {Array<Object>} */
function cpReadPrograms_() {
  var detail = cpReadProgramDetail_();
  var items = [];

  cpRows_(SHEETS.programs).forEach(function (row) {
    var title = cpText_(row[0]);
    if (!title) return;
    var extra = detail[title] || { instructions: [], exercises: [] };
    items.push({
      title: title,
      image: cpText_(row[1]),
      instructions: extra.instructions,
      exercises: extra.exercises
    });
  });
  return items;
}

/**
 * Agrupa ProgramaDetalle como listas de texto en el orden de la hoja.
 * @return {Object<string, {instructions: Array<string>, exercises: Array<string>}>}
 */
function cpReadProgramDetail_() {
  var map = {};
  cpRows_(SHEETS.programDetail).forEach(function (row, index) {
    var program = cpText_(row[0]);
    var type = cpText_(row[1]).toLowerCase();
    var text = cpText_(row[3]);
    if (!program || !text) return;

    var order = Number(String(row[2] || '').replace(',', '.'));
    if (!isFinite(order)) order = index + 1;

    if (!map[program]) map[program] = { instructions: [], exercises: [] };

    var entry = { text: text, order: order };
    if (type.indexOf('instru') === 0 || type === 'nota') {
      map[program].instructions.push(entry);
    } else {
      map[program].exercises.push(entry);
    }
  });

  Object.keys(map).forEach(function (program) {
    ['instructions', 'exercises'].forEach(function (type) {
      map[program][type] = map[program][type]
        .sort(function (a, b) { return a.order - b.order; })
        .map(function (entry) { return entry.text; });
    });
  });

  return map;
}

/**
 * Horario agrupado por día (el orden de los días es el de la hoja).
 * @return {Array<Object>}
 */
function cpReadSchedule_() {
  var groups = [];
  var byDay = {};
  var site = readSite_();

  cpRows_(SHEETS.schedule).forEach(function (row) {
    var day = cpText_(row[0]);
    if (!day) return;

    if (!byDay[day]) {
      byDay[day] = {
        day: day,
        color: cpText_(row[3]),
        shifts: []
      };
      groups.push(byDay[day]);
    }

    var label = cpText_(row[1]);
    var time = cpText_(row[2]);
    if (label || time) byDay[day].shifts.push({ label: label, time: time });
  });

  groups.forEach(function (group, index) {
    if (!group.color) group.color = defaultScheduleColor_(index, site);
  });
  return groups;
}

/** @return {Array<Object>} */
function cpReadSocial_() {
  var items = [];
  cpRows_(SHEETS.social).forEach(function (row) {
    var name = cpText_(row[0]);
    if (!name) return;
    items.push({
      name: name,
      icon: cpText_(row[1]) || 'fa-link',
      url: cpText_(row[2])
    });
  });
  return items;
}

/** @return {Array<Object>} */
function cpReadLog_() {
  var rows = cpRows_(SHEETS.log);
  return rows.slice(-20).reverse().map(function (row) {
    return {
      date: cpText_(row[0]),
      type: cpText_(row[1]),
      state: cpText_(row[2]),
      json: cpText_(row[3]).slice(0, 400)
    };
  });
}

/**
 * Qué secciones usan cada referencia de imagen.
 * @return {Object<string, Array<string>>}
 */
function cpImagesUsage_() {
  var usage = {};

  function add(ref, label) {
    if (!ref) return;
    if (!usage[ref]) usage[ref] = [];
    if (usage[ref].indexOf(label) === -1) usage[ref].push(label);
  }

  cpRows_(SHEETS.carousel).forEach(function (row, index) {
    add(cpText_(row[2]), 'Carrusel ' + (index + 1) + (cpText_(row[0]) ? ': ' + cpText_(row[0]) : ''));
  });
  cpRows_(SHEETS.features).forEach(function (row, index) {
    add(cpText_(row[2]), 'Característica ' + (index + 1));
  });
  cpRows_(SHEETS.programs).forEach(function (row) {
    add(cpText_(row[1]), 'Programa: ' + cpText_(row[0]));
  });

  return usage;
}

/** @return {Array<Object>} */
function cpTabStatus_() {
  var sheet = cpSpreadsheet_();
  return Object.keys(SHEETS).map(function (key) {
    var name = SHEETS[key];
    var tab = sheet.getSheetByName(name);
    return {
      key: key,
      name: name,
      exists: !!tab,
      rows: tab ? Math.max(tab.getLastRow() - 1, 0) : 0
    };
  });
}

/** @return {Object} */
function cpFolderInfo_() {
  var id = cpFolderId_();
  try {
    var folder = DriveApp.getFolderById(id);
    return { id: id, name: folder.getName(), url: folder.getUrl() };
  } catch (e) {
    return { id: id, name: '(no encontrada)', url: '' };
  }
}


// ============================================================
// ===  Guardar: Sitio  =======================================
// ============================================================

/**
 * Reescribe la pestaña "Sitio" completa.
 * @param {Array<{key: string, value: string}>} rows
 * @return {Object}
 */
function cpSaveSite(rows) {
  if (!rows || !rows.length) throw new Error('No hay datos del sitio para guardar.');

  var seen = {};
  var clean = [];

  rows.forEach(function (row) {
    var key = cpText_(row.key);
    if (!key) return;
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(key)) {
      throw new Error('La clave «' + key + '» no es válida: usa letras, números, guiones y guiones bajos.');
    }
    if (seen[key]) throw new Error('La clave «' + key + '» está repetida.');
    seen[key] = true;

    var value = cpText_(row.value);
    if (key.indexOf('color') === 0 && value && !/^#[0-9A-Fa-f]{3,8}$/.test(value)) {
      throw new Error('El color de «' + key + '» no es válido. Usa formato #RRGGBB.');
    }
    clean.push([key, value]);
  });

  cpWriteTable_(SHEETS.site, CP_HEADERS_.site, clean);
  cpBustCache_();
  return cpOk_('Se guardó la configuración del sitio (' + clean.length + ' campos).');
}


// ============================================================
// ===  Guardar: Imágenes  ====================================
// ============================================================

/**
 * Reescribe la pestaña "Imágenes". Si una referencia cambia de nombre,
 * actualiza también las referencias en Carrusel, Características y Programas.
 *
 * @param {Array<Object>} rows {ref, url, pos, fit, source, oldRef}
 * @return {Object}
 */
function cpSaveImages(rows) {
  if (!rows) throw new Error('No hay imágenes para guardar.');

  var previous = cpImageRefs_();
  var seen = {};
  var clean = [];
  var renames = {};

  rows.forEach(function (row) {
    var ref = cpText_(row.ref);
    if (!ref) throw new Error('Cada imagen necesita una referencia.');
    if (!/^[A-Za-z0-9_-]+$/.test(ref)) {
      throw new Error('La referencia «' + ref + '» sólo admite letras, números, guiones y guiones bajos.');
    }
    if (seen[ref.toLowerCase()]) {
      throw new Error('La referencia «' + ref + '» está repetida.');
    }
    seen[ref.toLowerCase()] = true;

    var url = cpText_(row.url);
    if (url && !convertImageUrl(url)) {
      throw new Error('La URL de «' + ref + '» no es válida. Pega un enlace de Drive o una URL https.');
    }

    var oldRef = cpText_(row.oldRef);
    if (oldRef && oldRef !== ref) renames[oldRef] = ref;

    clean.push([
      ref,
      url,
      normalizePosValue_(row.pos),
      cpText_(row.source),
      normalizeFitValue_(row.fit)
    ]);
  });

  cpWriteTable_(SHEETS.images, CP_HEADERS_.images, clean);
  var renamed = cpApplyImageRenames_(renames);
  cpBustCache_();

  var warnings = [];
  var current = {};
  clean.forEach(function (row) { current[row[0]] = true; });

  Object.keys(previous).forEach(function (ref) {
    if (current[ref]) return;
    var usage = cpImagesUsage_()[ref];
    if (usage && usage.length) {
      warnings.push('«' + ref + '» se quitó pero todavía se usa en ' + usage.join(', ') + '.');
    }
  });

  var message = 'Se guardaron ' + clean.length + ' imágenes.';
  if (renamed) message += ' Se actualizaron ' + renamed + ' referencias en otras pestañas.';
  if (warnings.length) message += ' Aviso: ' + warnings.join(' ');

  return cpOk_(message, warnings.length > 0);
}

/**
 * Aplica cambios de nombre de referencia en las pestañas que las usan.
 * @param {Object<string, string>} renames
 * @return {number} Celdas actualizadas.
 */
function cpApplyImageRenames_(renames) {
  var keys = Object.keys(renames);
  if (!keys.length) return 0;

  var updated = 0;
  var targets = [
    { name: SHEETS.carousel, column: 3 },
    { name: SHEETS.features, column: 3 },
    { name: SHEETS.programs, column: 2 }
  ];

  targets.forEach(function (target) {
    var sheet = cpSpreadsheet_().getSheetByName(target.name);
    if (!sheet || sheet.getLastRow() < 2) return;

    var values = sheet.getDataRange().getValues();
    var changed = false;

    for (var i = 1; i < values.length; i++) {
      var value = cpText_(values[i][target.column - 1]);
      if (renames[value]) {
        values[i][target.column - 1] = renames[value];
        changed = true;
        updated++;
      }
    }

    if (changed) {
      sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
    }
  });

  return updated;
}


// ============================================================
// ===  Guardar: Carrusel y Características  ==================
// ============================================================

/** @param {Array<Object>} rows @return {Object} */
function cpSaveCarousel(rows) {
  var images = cpImageRefs_();
  var clean = [];

  (rows || []).forEach(function (row) {
    var title = cpText_(row.title);
    var description = cpText_(row.description);
    var image = cpText_(row.image);
    if (!title && !description && !image) return;

    cpAssertImageRef_(image, images, 'El carrusel');

    clean.push([title, description, image, clean.length + 1]);
  });

  cpWriteTable_(SHEETS.carousel, CP_HEADERS_.carousel, clean);
  cpBustCache_();
  return cpOk_('Se guardó el carrusel (' + clean.length + ' diapositivas).');
}

/** @param {Array<Object>} rows @return {Object} */
function cpSaveFeatures(rows) {
  var images = cpImageRefs_();
  var clean = [];

  (rows || []).forEach(function (row) {
    var title = cpText_(row.title);
    var description = cpText_(row.description);
    var image = cpText_(row.image);
    if (!title && !description && !image) return;

    cpAssertImageRef_(image, images, 'La característica');

    clean.push([title, description, image, clean.length + 1]);
  });

  cpWriteTable_(SHEETS.features, CP_HEADERS_.features, clean);
  cpBustCache_();
  return cpOk_('Se guardaron las características (' + clean.length + ' bloques).');
}


// ============================================================
// ===  Guardar: Programas + detalle  =========================
// ============================================================

/**
 * Reescribe "Programas" y "ProgramaDetalle" en una sola operación.
 * @param {Array<Object>} rows
 * @return {Object}
 */
function cpSavePrograms(rows) {
  var images = cpImageRefs_();
  var titles = {};
  var programs = [];
  var details = [];

  (rows || []).forEach(function (row, index) {
    var title = cpText_(row.title);
    if (!title) throw new Error('Cada programa necesita un título.');

    var key = title.toLowerCase();
    if (titles[key]) throw new Error('El programa «' + title + '» está repetido.');
    titles[key] = true;

    var image = cpText_(row.image);
    cpAssertImageRef_(image, images, 'El programa «' + title + '»');
    programs.push([title, image, index + 1]);

    (row.instructions || []).forEach(function (text) {
      var clean = cpText_(text);
      if (clean) details.push([title, 'Instrucción', details.length + 1, clean]);
    });

    (row.exercises || []).forEach(function (text) {
      var clean = cpText_(text);
      if (clean) details.push([title, 'Ejercicio', details.length + 1, clean]);
    });
  });

  cpWriteTable_(SHEETS.programs, CP_HEADERS_.programs, programs);
  cpWriteTable_(SHEETS.programDetail, CP_HEADERS_.programDetail, details);
  cpBustCache_();
  return cpOk_('Se guardaron ' + programs.length + ' programas y ' + details.length + ' líneas de rutina.');
}


// ============================================================
// ===  Guardar: Horario y Redes  =============================
// ============================================================

/**
 * @param {Array<Object>} rows [{day, color, shifts:[{label,time}]}]
 * @return {Object}
 */
function cpSaveSchedule(rows) {
  var days = {};
  var clean = [];
  var order = 0;

  (rows || []).forEach(function (group) {
    var day = cpText_(group.day);
    if (!day) return;

    var key = day.toLowerCase();
    if (days[key]) throw new Error('El día «' + day + '» está repetido.');
    days[key] = true;

    var color = cpText_(group.color) || '#0E0E53';
    if (!/^#[0-9A-Fa-f]{3,8}$/.test(color)) {
      throw new Error('El color de «' + day + '» no es válido.');
    }

    order++;
    var dayRows = [];

    (group.shifts || []).forEach(function (shift) {
      var label = cpText_(shift.label);
      var time = cpText_(shift.time);
      if (!label && !time) return;
      if (!time) throw new Error('El turno «' + (label || 'sin nombre') + '» de ' + day + ' necesita un horario.');
      dayRows.push([day, label, time, color, order]);
    });

    // Un día sin turnos se muestra como "Cerrado" en el sitio.
    if (!dayRows.length) {
      dayRows.push([day, '', 'Cerrado', color, order]);
    }

    clean = clean.concat(dayRows);
  });

  cpWriteTable_(SHEETS.schedule, CP_HEADERS_.schedule, clean);
  cpBustCache_();
  return cpOk_('Se guardó el horario (' + Object.keys(days).length + ' días).');
}

/** @param {Array<Object>} rows @return {Object} */
function cpSaveSocial(rows) {
  var clean = [];

  (rows || []).forEach(function (row) {
    var name = cpText_(row.name);
    var url = cpText_(row.url);
    if (!name && !url) return;
    if (!name) throw new Error('Cada red social necesita un nombre.');
    if (!/^https?:\/\//i.test(url)) {
      throw new Error('La URL de «' + name + '» debe empezar con http:// o https://');
    }

    clean.push([name, cpText_(row.icon) || 'fa-link', url, clean.length + 1]);
  });

  cpWriteTable_(SHEETS.social, CP_HEADERS_.social, clean);
  cpBustCache_();
  return cpOk_('Se guardaron ' + clean.length + ' redes sociales.');
}


// ============================================================
// ===  Imágenes: explorador y subida  ========================
// ============================================================

/**
 * Lista subcarpetas y archivos de la carpeta de imágenes.
 * @param {string} [subPath] Ruta relativa, ej. 'gallery'.
 * @return {Object}
 */
function cpListImages(subPath) {
  var path = cpCleanPath_(subPath);
  var folder = cpFolder_(path, false);

  var folders = [];
  var foldersIt = folder.getFolders();
  while (foldersIt.hasNext()) {
    var sub = foldersIt.next();
    folders.push({
      name: sub.getName(),
      path: path ? path + '/' + sub.getName() : sub.getName()
    });
  }

  var files = [];
  var filesIt = folder.getFiles();
  while (filesIt.hasNext()) {
    var file = filesIt.next();
    var mime = String(file.getMimeType() || '');
    if (mime.indexOf('image/') !== 0) continue;

    var id = file.getId();
    files.push({
      id: id,
      name: file.getName(),
      url: 'https://drive.google.com/file/d/' + id + '/view',
      thumb: 'https://lh3.googleusercontent.com/d/' + id,
      path: path ? path + '/' + file.getName() : file.getName(),
      size: file.getSize(),
      updated: file.getLastUpdated().toISOString()
    });
  }

  folders.sort(function (a, b) { return a.name.localeCompare(b.name); });
  files.sort(function (a, b) { return b.updated.localeCompare(a.updated); });

  return {
    path: path,
    folderId: folder.getId(),
    folderName: folder.getName(),
    parent: path ? path.split('/').slice(0, -1).join('/') : '',
    folders: folders,
    files: files
  };
}

/**
 * Sube una imagen (base64) a la carpeta de Drive y, si se pide, registra
 * automáticamente una nueva referencia en la pestaña "Imágenes".
 *
 * @param {string} base64Data
 * @param {string} filename
 * @param {string} mimeType
 * @param {string} [subPath]
 * @param {boolean} [registerRef]
 * @return {Object}
 */
function cpUploadImage(base64Data, filename, mimeType, subPath, registerRef) {
  if (!base64Data) throw new Error('El archivo llegó vacío.');

  var data = String(base64Data);
  if (data.indexOf(',') !== -1) data = data.split(',')[1];
  if (data.length > 12 * 1024 * 1024) {
    throw new Error('La imagen es demasiado grande. Usa un archivo de menos de 8 MB.');
  }

  var name = cpSafeFilename_(filename || 'imagen.jpg');
  var type = cpText_(mimeType) || cpMimeFromName_(name);
  var path = cpCleanPath_(subPath);
  var folder = cpFolder_(path, true);

  var file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(data), type, name));
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (_) {
    // Si la política de Drive lo impide, la imagen igual queda subida.
  }

  var id = file.getId();
  var result = {
    id: id,
    name: file.getName(),
    url: 'https://drive.google.com/file/d/' + id + '/view',
    thumb: 'https://lh3.googleusercontent.com/d/' + id,
    source: path ? path + '/' + file.getName() : file.getName()
  };

  var image = null;
  if (registerRef) {
    var ref = cpUniqueRef_(cpBaseName_(file.getName()));
    cpSpreadsheet_().getSheetByName(SHEETS.images).appendRow([
      ref, result.url, 'center', result.source, 'cover'
    ]);
    cpBustCache_();
    image = { ref: ref, url: result.url, pos: 'center', source: result.source, fit: 'cover', thumb: result.thumb };
  }

  return {
    ok: true,
    message: 'Imagen subida: ' + result.name,
    file: result,
    image: image
  };
}

/**
 * Extrae el ID de un archivo de Drive a partir de sus URLs habituales.
 * @param {string} url
 * @return {string}
 */
function cpDriveId_(url) {
  var value = String(url || '');

  var match = value.match(/drive\.google\.com\/file\/d\/([^\/?#]+)/) ||
    value.match(/drive\.google\.com\/open\?id=([^&]+)/) ||
    value.match(/drive\.google\.com\/uc\?.*id=([^&]+)/) ||
    value.match(/drive\.google\.com\/thumbnail\?id=([^&]+)/) ||
    value.match(/lh3\.googleusercontent\.com\/d\/([^\/?#]+)/);

  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Revisa un archivo de Drive: que sea imagen y que esté compartido en público.
 * @param {string} id
 * @return {Object}
 */
function cpCheckDriveImage_(id) {
  try {
    var file = DriveApp.getFileById(id);
    var mime = String(file.getMimeType() || '');
    var access = file.getSharingAccess();
    var isPublic = access === DriveApp.Access.ANYONE ||
      access === DriveApp.Access.ANYONE_WITH_LINK;

    if (mime.indexOf('image/') !== 0) {
      return { ok: false, status: 'No es una imagen · ' + (mime || 'desconocido') };
    }

    if (!isPublic) {
      // Puede heredar el permiso público de una carpeta; comprobamos la URL
      // que realmente usa el sitio antes de darlo por privado.
      try {
        var response = UrlFetchApp.fetch('https://lh3.googleusercontent.com/d/' + id, {
          muteHttpExceptions: true,
          followRedirects: true
        });
        var code = response.getResponseCode();
        var type = String(response.getHeaders()['Content-Type'] || '');
        if (code === 200 && type.indexOf('image/') === 0) {
          return { ok: true, status: 'Pública · ' + mime.split('/')[1].toUpperCase() };
        }
      } catch (_) {}

      return { ok: false, status: 'Sólo personas con permiso' };
    }

    return { ok: true, status: 'Pública · ' + mime.split('/')[1].toUpperCase() };
  } catch (e) {
    return { ok: false, status: 'No se encontró en Drive' };
  }
}

/**
 * Comprueba que cada imagen responda como imagen (útil antes de publicar).
 * Para archivos de Drive revisa el permiso real; para el resto hace una
 * petición HTTP y comprueba el tipo de contenido.
 * @return {Array<Object>}
 */
function cpCheckImages() {
  var images = cpReadImages_();
  var results = [];

  images.forEach(function (image) {
    if (!image.url) {
      results.push({ ref: image.ref, ok: false, status: 'Sin URL' });
      return;
    }

    var driveId = cpDriveId_(image.url);
    if (driveId) {
      var driveResult = cpCheckDriveImage_(driveId);
      results.push({ ref: image.ref, ok: driveResult.ok, status: driveResult.status });
      return;
    }

    try {
      var response = UrlFetchApp.fetch(image.url, { muteHttpExceptions: true, followRedirects: true });
      var code = response.getResponseCode();
      var type = String(response.getHeaders()['Content-Type'] || '');
      results.push({
        ref: image.ref,
        ok: code === 200 && type.indexOf('image/') === 0,
        status: code + (type ? ' · ' + type.split(';')[0] : '')
      });
    } catch (e) {
      results.push({ ref: image.ref, ok: false, status: e.message });
    }

    Utilities.sleep(120);
  });

  return results;
}


// ============================================================
// ===  Sistema  ==============================================
// ============================================================

/** Limpia la caché del sitio público. */
function cpRefreshCache() {
  refreshData();
  return cpOk_('Caché del sitio eliminada. Los cambios ya se ven al recargar.');
}

/** Crea las pestañas que falten (no borra datos). */
function cpSetupSheets() {
  var message = setupSheets();
  return cpOk_(message);
}

/**
 * Copia la hoja de cálculo junto al archivo original.
 * @return {Object}
 */
function cpBackup() {
  var sheet = cpSpreadsheet_();
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH-mm');
  var copy = DriveApp.getFileById(sheet.getId())
    .makeCopy('Gymbars DB — respaldo ' + stamp, cpBackupFolder_());

  log_('backup', 'OK', copy.getName());
  return {
    ok: true,
    message: 'Respaldo creado: ' + copy.getName(),
    name: copy.getName(),
    url: copy.getUrl()
  };
}


// ============================================================
// ===  Utilidades internas  ==================================
// ============================================================

/** @return {GoogleAppsScript.Spreadsheet.Spreadsheet} */
function cpSpreadsheet_() {
  var sheet = ss_();
  if (!sheet) {
    throw new Error('Abre el panel desde la hoja de cálculo de Gymbars (menú Gymbars → Abrir panel).');
  }
  return sheet;
}

/**
 * Filas de datos (sin encabezado) como texto.
 * @param {string} name
 * @return {Array<Array<string>>}
 */
function cpRows_(name) {
  var sheet = cpSpreadsheet_().getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var columns = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, columns).getDisplayValues();
}

/**
 * Reescribe una tabla completa (encabezado + filas).
 * @param {string} name
 * @param {Array<string>} headers
 * @param {Array<Array>} rows
 */
function cpWriteTable_(name, headers, rows) {
  var sheet = cpSpreadsheet_().getSheetByName(name);
  if (!sheet) {
    sheet = cpSpreadsheet_().insertSheet(name);
  }

  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  if (sheet.getMaxRows() < rows.length + 1) {
    sheet.insertRowsAfter(sheet.getMaxRows(), rows.length + 1 - sheet.getMaxRows());
  }

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), headers.length)).clearContent();
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sheet.setFrozenRows(1);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  SpreadsheetApp.flush();
}

/** @return {Object<string, boolean>} */
function cpImageRefs_() {
  var refs = {};
  cpRows_(SHEETS.images).forEach(function (row) {
    var ref = cpText_(row[0]);
    if (ref) refs[ref] = true;
  });
  return refs;
}

/**
 * @param {string} ref
 * @param {Object<string, boolean>} refs
 * @param {string} context
 */
function cpAssertImageRef_(ref, refs, context) {
  if (!ref) return;
  if (refs[ref]) return;
  if (/^https?:\/\//i.test(ref)) return;
  throw new Error(context + ' usa la imagen «' + ref + '», que ya no existe en la pestaña Imágenes.');
}

/** @return {string} */
function cpFolderId_() {
  var custom = '';
  try {
    custom = PropertiesService.getScriptProperties().getProperty(CP_FOLDER_PROPERTY) || '';
  } catch (_) {}
  return String(custom || CP_IMAGE_FOLDER_ID).trim();
}

/**
 * Resuelve (y opcionalmente crea) una carpeta dentro de la carpeta de imágenes.
 * @param {string} path
 * @param {boolean} create
 * @return {GoogleAppsScript.Drive.Folder}
 */
function cpFolder_(path, create) {
  var folder;
  try {
    folder = DriveApp.getFolderById(cpFolderId_());
  } catch (e) {
    throw new Error('No se encontró la carpeta de imágenes en Drive. Revisa el ID de la carpeta.');
  }

  cpCleanPath_(path).split('/').forEach(function (part) {
    if (!part) return;
    var children = folder.getFoldersByName(part);
    if (children.hasNext()) {
      folder = children.next();
    } else if (create) {
      folder = folder.createFolder(part);
    } else {
      throw new Error('La carpeta «' + part + '» no existe en Drive.');
    }
  });

  return folder;
}

/** @return {string} */
function cpCleanPath_(path) {
  return String(path || '')
    .split('/')
    .map(function (part) { return part.trim(); })
    .filter(function (part) { return part && part !== '.' && part !== '..'; })
    .join('/');
}

/** @return {string} */
function cpSafeFilename_(name) {
  var clean = String(name || 'imagen.jpg')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return clean || 'imagen.jpg';
}

/** @return {string} */
function cpBaseName_(name) {
  return String(name || '').replace(/\.[^.]+$/, '');
}

/** @return {string} */
function cpMimeFromName_(name) {
  var lower = String(name || '').toLowerCase();
  if (/\.png$/.test(lower)) return 'image/png';
  if (/\.webp$/.test(lower)) return 'image/webp';
  if (/\.gif$/.test(lower)) return 'image/gif';
  if (/\.avif$/.test(lower)) return 'image/avif';
  return 'image/jpeg';
}

/**
 * Genera una referencia única a partir del nombre del archivo.
 * @param {string} base
 * @return {string}
 */
function cpUniqueRef_(base) {
  var refs = {};
  Object.keys(cpImageRefs_()).forEach(function (ref) { refs[ref.toLowerCase()] = true; });

  var slug = slugify_(base) || 'imagen';
  var candidate = slug;
  var suffix = 2;

  while (refs[candidate.toLowerCase()]) {
    candidate = slug + '-' + suffix;
    suffix++;
  }
  return candidate;
}

/** @return {GoogleAppsScript.Drive.Folder} */
function cpBackupFolder_() {
  try {
    var parents = DriveApp.getFileById(cpSpreadsheet_().getId()).getParents();
    if (parents.hasNext()) return parents.next();
  } catch (_) {}
  return DriveApp.getRootFolder();
}

function cpBustCache_() {
  try { CacheService.getScriptCache().remove('gymbars:data'); } catch (_) {}
}

/** @param {string} text */
function cpText_(text) {
  return text === null || text === undefined ? '' : String(text).trim();
}

/**
 * @param {string} message
 * @param {boolean} [warning]
 * @return {Object}
 */
function cpOk_(message, warning) {
  return { ok: true, message: message, warning: !!warning };
}

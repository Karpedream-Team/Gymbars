/**
 * WebsiteService.gs — Lee la hoja de cálculo y arma el modelo de datos del sitio.
 *
 * Toda la información que consume el front-end pasa por getWebsiteData():
 * así el HTML no consulta la hoja desde el navegador (más rápido y sin
 * exponer la hoja), y cualquier cambio en las pestañas se refleja al recargar.
 */

/**
 * Devuelve el modelo completo del sitio.
 *
 * @param {Object} [options]
 * @param {boolean} [options.useCache=true] Leer de CacheService si está disponible.
 * @return {Object} { site, images, carousel, features, programs, schedule, social, updatedAt }
 */
function getWebsiteData(options) {
  var useCache = !options || options.useCache !== false;
  var cache = null;
  if (useCache && CACHE_SECONDS > 0) {
    try { cache = CacheService.getScriptCache(); } catch (_) { cache = null; }
    if (cache) {
      var cached = cache.get('gymbars:data');
      if (cached) {
        try { return JSON.parse(cached); } catch (_) { /* caché corrupta: seguimos */ }
      }
    }
  }

  var site = readSite_();
  var images = readImages_();

  var data = {
    site: site,
    images: images,
    carousel: readCarousel_(images),
    features: readFeatures_(images),
    programs: readPrograms_(images),
    schedule: readSchedule_(site),
    social: readSocial_(),
    updatedAt: new Date().toISOString()
  };

  if (cache) {
    try { cache.put('gymbars:data', JSON.stringify(data), CACHE_SECONDS); } catch (_) {}
  }
  return data;
}


// ============================================================
// ===  Lectores por pestaña  =================================
// ============================================================

/**
 * Lee "Sitio" (Clave | Valor) y completa valores por defecto.
 * @return {Object}
 */
function readSite_() {
  var defaults = {
    nombre: 'Gymbars',
    lema: '',
    tituloSEO: 'Gymbars',
    descripcionSEO: '',
    telefono: '',
    whatsapp: '',
    facebook: '',
    instagram: '',
    messenger: '',
    direccion1: '',
    direccion2: '',
    direccion3: '',
    mapaUrl: '',
    mapaEnlace: '',
    dominio: 'https://gymbarsgt.com',
    colorNavbar: '#000000',
    colorFondo: '#FFFFFF',
    colorSeccion: '#F8F9FA',
    colorTexto: '#212529',
    colorTextoClaro: '#F8F9FA',
    colorAcento: '#0E0E53',
    colorSabado: '#323232',
    colorDomingo: '#960000',
    colorContacto: '#343A40',
    licencia: 'MIT License',
    copyright: '',
    horarioTitulo: 'Horario',
    contactoTitulo: 'Contacto',
    programasTitulo: 'Rutinas de Calistenia',
    ubicacionTitulo: 'Ubicación',
    tipografia: 'Roboto'
  };

  var values = readTable_(SHEETS.site);
  var site = {};
  var knownKeys = Object.keys(defaults);

  for (var i = 1; i < values.length; i++) {
    var key = normalizeSiteKey_(values[i][0], knownKeys);
    if (!key) continue;
    var value = values[i][1];
    site[key] = (value === null || value === undefined) ? '' : String(value);
  }

  for (var prop in defaults) {
    if (Object.prototype.hasOwnProperty.call(defaults, prop) &&
        (site[prop] === undefined || site[prop] === '')) {
      site[prop] = defaults[prop];
    }
  }

  site.whatsappDigits = String(site.whatsapp || '').replace(/[^0-9]/g, '');
  site.telefonoDigits = String(site.telefono || '').replace(/[^0-9+]/g, '');
  return site;
}

/**
 * Lee "Imágenes" (Referencia | URL | Posición) y devuelve un mapa por referencia.
 * @return {Object<string, {url: string, pos: string}>}
 */
function readImages_() {
  var values = readTable_(SHEETS.images);
  var images = {};

  for (var i = 1; i < values.length; i++) {
    var ref = String(values[i][0] || '').trim();
    if (!ref) continue;
    images[ref] = {
      url: convertImageUrl(values[i][1]),
      pos: normalizePosValue_(values[i][2]),
      source: String(values[i][3] || '').trim(),
      fit: normalizeFitValue_(values[i][4])
    };
  }
  return images;
}

/**
 * Lee "Carrusel" y resuelve cada imagen contra el mapa de "Imágenes".
 * @param {Object} images
 * @return {Array<Object>}
 */
function readCarousel_(images) {
  var values = readTable_(SHEETS.carousel);
  var items = [];

  for (var i = 1; i < values.length; i++) {
    var ref = String(values[i][2] || '').trim();
    var image = resolveImage_(images, ref);
    var title = String(values[i][0] || '').trim();
    var description = String(values[i][1] || '').trim();

    // Una fila vacía (sin texto y sin imagen) se ignora; si falta la imagen
    // pero hay texto, se conserva para mostrar el placeholder con su leyenda.
    if (!title && !description && !image.url) continue;

    items.push({
      title: title,
      description: description,
      image: image.url,
      pos: image.pos,
      fit: image.fit,
      order: parseNumber_(values[i][3], i)
    });
  }
  return sortByOrder_(items);
}

/**
 * Lee "Características".
 * @param {Object} images
 * @return {Array<Object>}
 */
function readFeatures_(images) {
  var values = readTable_(SHEETS.features);
  var items = [];

  for (var i = 1; i < values.length; i++) {
    var title = String(values[i][0] || '').trim();
    var description = String(values[i][1] || '').trim();
    if (!title && !description) continue;

    var image = resolveImage_(images, String(values[i][2] || '').trim());
    items.push({
      title: title,
      description: description,
      image: image.url,
      pos: image.pos,
      fit: image.fit,
      order: parseNumber_(values[i][3], i)
    });
  }
  return sortByOrder_(items);
}

/**
 * Lee "Programas" + "ProgramaDetalle" (instrucciones y ejercicios).
 * @param {Object} images
 * @return {Array<Object>}
 */
function readPrograms_(images) {
  var detail = readProgramDetail_();
  var values = readTable_(SHEETS.programs);
  var items = [];

  for (var i = 1; i < values.length; i++) {
    var title = String(values[i][0] || '').trim();
    if (!title) continue;

    var image = resolveImage_(images, String(values[i][1] || '').trim());
    var extra = detail[title] || { instructions: [], exercises: [] };

    items.push({
      title: title,
      slug: slugify_(title),
      image: image.url,
      pos: image.pos,
      fit: image.fit,
      instructions: extra.instructions,
      exercises: extra.exercises,
      order: parseNumber_(values[i][2], i)
    });
  }
  return sortByOrder_(items);
}

/**
 * Agrupa "ProgramaDetalle" por programa.
 * @return {Object<string, {instructions: Array, exercises: Array}>}
 */
function readProgramDetail_() {
  var values = readTable_(SHEETS.programDetail);
  var map = {};

  for (var i = 1; i < values.length; i++) {
    var program = String(values[i][0] || '').trim();
    var type = String(values[i][1] || '').trim().toLowerCase();
    var text = String(values[i][3] || '').trim();
    if (!program || !text) continue;

    if (!map[program]) map[program] = { instructions: [], exercises: [] };
    var entry = { text: text, order: parseNumber_(values[i][2], i) };

    // "Instrucción"/"Instruccion"/"Nota" → instrucciones; el resto, ejercicios.
    if (type.indexOf('instru') === 0 || type === 'nota') {
      map[program].instructions.push(entry);
    } else {
      map[program].exercises.push(entry);
    }
  }

  for (var key in map) {
    if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
    map[key].instructions = sortByOrder_(map[key].instructions).map(function (x) { return x.text; });
    map[key].exercises = sortByOrder_(map[key].exercises).map(function (x) { return x.text; });
  }
  return map;
}

/**
 * Lee "Horario" y agrupa los turnos por día, conservando el orden.
 * @param {Object} site
 * @return {Array<{day: string, shifts: Array<{label: string, time: string}>, color: string}>}
 */
function readSchedule_(site) {
  var values = readTable_(SHEETS.schedule);
  var groups = [];
  var index = {};

  for (var i = 1; i < values.length; i++) {
    var day = String(values[i][0] || '').trim();
    if (!day) continue;

    var label = String(values[i][1] || '').trim();
    var time = String(values[i][2] || '').trim();
    var color = String(values[i][3] || '').trim();
    var order = parseNumber_(values[i][4], i);

    if (!index[day]) {
      index[day] = {
        day: day,
        shifts: [],
        color: color || defaultScheduleColor_(groups.length, site),
        order: order
      };
      groups.push(index[day]);
    }
    if (color && !index[day].color) index[day].color = color;
    if (time) index[day].shifts.push({ label: label, time: time });
  }

  return sortByOrder_(groups);
}

/**
 * Color por defecto del encabezado de cada día.
 */
function defaultScheduleColor_(position, site) {
  if (position === 1) return site.colorSabado;
  if (position === 2) return site.colorDomingo;
  return site.colorAcento;
}

/**
 * Lee "Redes".
 * @return {Array<{name: string, icon: string, url: string}>}
 */
function readSocial_() {
  var values = readTable_(SHEETS.social);
  var items = [];

  for (var i = 1; i < values.length; i++) {
    var name = String(values[i][0] || '').trim();
    var url = String(values[i][2] || '').trim();
    if (!name || !url) continue;

    items.push({
      name: name,
      icon: String(values[i][1] || 'fa-link').trim(),
      url: url,
      order: parseNumber_(values[i][3], i)
    });
  }
  return sortByOrder_(items);
}


// ============================================================
// ===  Utilidades  ===========================================
// ============================================================

/**
 * Devuelve una pestaña como matriz (incluye encabezado).
 * @param {string} name
 * @return {Array<Array>}
 */
function readTable_(name) {
  var sheet = ss_().getSheetByName(name);
  if (!sheet || sheet.getLastRow() === 0) return [];
  return sheet.getDataRange().getValues();
}

/**
 * Resuelve la referencia de una imagen contra el mapa de "Imágenes".
 * @param {Object} images
 * @param {string} ref
 * @return {{url: string, pos: string}}
 */
function resolveImage_(images, ref) {
  if (!ref) return { url: '', pos: 'center', fit: 'cover' };
  if (images[ref]) return { url: images[ref].url, pos: images[ref].pos, fit: images[ref].fit };
  // Si en la celda escribieron una URL directa en lugar de una referencia.
  return { url: convertImageUrl(ref), pos: 'center', fit: 'cover' };
}

/**
 * Normaliza cómo se ajusta la imagen a su caja (background-size).
 * @param {string} raw
 * @return {string} 'cover' | 'contain'
 */
function normalizeFitValue_(raw) {
  var value = String(raw || '').trim().toLowerCase();
  return value === 'contain' || value === 'ajustar' ? 'contain' : 'cover';
}

/**
 * Convierte una URL de Drive en una URL visible para <img>.
 * Las imágenes deben estar compartidas como "cualquiera con el enlace".
 * @param {string} url
 * @return {string}
 */
function convertImageUrl(url) {
  if (!url) return '';
  url = String(url).trim();

  var driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/) ||
    url.match(/drive\.google\.com\/open\?id=([^&]+)/) ||
    url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/) ||
    url.match(/drive\.google\.com\/thumbnail\?id=([^&]+)/);
  if (driveFileMatch) {
    return 'https://lh3.googleusercontent.com/d/' + driveFileMatch[1];
  }

  if (url.match(/^https?:\/\//)) return url;
  return '';
}

/**
 * Normaliza la posición de una imagen (object-position).
 * @param {string} raw
 * @return {string}
 */
function normalizePosValue_(raw) {
  var map = {
    'arriba': 'top', 'top': 'top',
    'centro': 'center', 'center': 'center',
    'abajo': 'bottom', 'bottom': 'bottom',
    'izquierda': 'left', 'left': 'left',
    'derecha': 'right', 'right': 'right'
  };
  return map[String(raw || '').trim().toLowerCase()] || 'center';
}

/**
 * Convierte "Título con espacios" en "titulo-con-espacios".
 * @param {string} text
 * @return {string}
 */
function slugify_(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normaliza la clave de "Sitio" contra las claves conocidas.
 * Acepta "colorNavbar" (exacta), "ColorNavbar" (sin distinguir mayúsculas)
 * o "Color Navbar" (con espacios → camelCase).
 *
 * @param {string} rawKey
 * @param {Array<string>} knownKeys
 * @return {string}
 */
function normalizeSiteKey_(rawKey, knownKeys) {
  var key = String(rawKey || '').trim();
  if (!key) return '';

  if (knownKeys.indexOf(key) !== -1) return key;

  var lower = key.toLowerCase();
  for (var i = 0; i < knownKeys.length; i++) {
    if (knownKeys[i].toLowerCase() === lower) return knownKeys[i];
  }
  return camelKey_(key);
}

/**
 * Convierte encabezados como "Color Navbar" en "colorNavbar".
 * @param {string} key
 * @return {string}
 */
function camelKey_(key) {
  var parts = String(key || '').trim().split(/\s+/);
  return parts.map(function (part, i) {
    var lower = part.toLowerCase();
    return i === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join('');
}

/**
 * @param {*} value
 * @param {number} fallback
 * @return {number}
 */
function parseNumber_(value, fallback) {
  var num = parseFloat(value);
  return isNaN(num) ? fallback : num;
}

/**
 * Ordena por la propiedad `order` (ascendente) sin mutar el arreglo.
 * @template T
 * @param {Array<T>} items
 * @return {Array<T>}
 */
function sortByOrder_(items) {
  return items.slice().sort(function (a, b) {
    return (a.order || 0) - (b.order || 0);
  });
}

# Gymbars — Web App (Google Sheets + Apps Script)

Migración de **gymbarsgt.com** (Firebase Hosting + Cloud Firestore) a **Google Apps Script**
usando una **hoja de cálculo como base de datos** para gestionar el contenido del sitio
y su panel de administración.

```
code/
├── Code.gs                    # doGet, include(), logger, menú, setupSheets()
├── WebsiteService.gs          # Lee la hoja y arma el modelo JSON del sitio
├── Index.html                 # Shell: fuentes, tema, parciales
├── Styles.html                # Variables CSS y estilos base
├── Navbar/
│   ├── Navbar.html
│   └── NavbarStyles.html
├── HomePage/
│   ├── HomePage.html          # Carrusel, info, horario, contacto, programas, ubicación
│   └── HomePageStyles.html
├── ProgramModal/
│   ├── ProgramModal.html      # Detalle de rutina (instrucciones + ejercicios)
│   └── ProgramModalStyles.html
├── Footer/
│   ├── Footer.html
│   └── FooterStyles.html
├── Router/
│   └── Router.html            # Inicialización, rutas por hash, scroll-spy
├── ConfigPanel/
│   ├── ConfigPanel.html       # Shell del panel: navegación, estado, guardado, subidas
│   ├── ConfigPanelService.gs  # API del panel (cpGetData, cpSave*, subidas, respaldo)
│   ├── ConfigPanelStyles.html # Tema del panel
│   ├── ImagePicker/           # Selector de archivos de la carpeta de Drive
│   ├── TabSitio/              # Campos de la pestaña Sitio (con esquema y ayudas)
│   ├── TabImagenes/           # Tarjetas de Imágenes, uso, subida y recorte
│   ├── TabCarrusel/           # Diapositivas ordenables
│   ├── TabCaracteristicas/    # Bloques de la portada
│   ├── TabProgramas/          # Rutinas + instrucciones/ejercicios
│   ├── TabHorario/            # Días, turnos y colores
│   ├── TabRedes/              # Redes sociales e iconos
│   └── TabSistema/            # Respaldo, caché, diagnóstico y bitácora
├── appsscript.json
├── .clasp.json.example
└── README.md
```

## Cómo funciona

1. `doGet()` en `Code.gs` llama a `getWebsiteData()` (`WebsiteService.gs`).
2. El modelo se serializa y se incrusta en `Index.html` (`const siteData = {...}`).
   El navegador **no** consulta la hoja: recibe todo el contenido ya resuelto.
3. Cada componente (`Navbar`, `HomePage`, `Footer`, `ProgramModal`) se renderiza con
   los datos globales `site`, `images`, `carouselItems`, `features`, `programs`,
   `schedule`, `social`.
4. Los cambios en la hoja se ven al recargar (caché de 5 minutos; menú
   **Gymbars → Limpiar caché del sitio** para forzar).

Endpoints:

| URL | Respuesta |
| --- | --- |
| `/exec` | Sitio completo (HTML) |
| `/exec?api=data` | JSON con el modelo del sitio (depuración) |

Rutas del front:

| Hash | Vista |
| --- | --- |
| `#home` o sin hash | Portada |
| `#programa/<slug>` | Detalle de rutina (modal) |

## Base de datos (hoja de cálculo)

Hoja: `1mSRg6hCjZef8XXR9G7f0hwQinnxJJb7CWwM9McvHIUE`

| Pestaña | Columnas | Uso |
| --- | --- | --- |
| **Sitio** | Clave \| Valor | Textos, contacto, colores, redes, SEO |
| **Imágenes** | Referencia \| URL \| Posición \| ArchivoDrive \| Ajuste | Mapa de imágenes (Drive) |
| **Carrusel** | Título \| Descripción \| Imagen \| Orden | Fotos del carrusel |
| **Características** | Título \| Descripción \| Imagen \| Orden | 3 bloques bajo la portada |
| **Programas** | Título \| Imagen \| Orden | Tarjetas de rutinas |
| **ProgramaDetalle** | Programa \| Tipo \| Orden \| Texto | Instrucciones y ejercicios |
| **Horario** | Día \| Turno \| Horario \| Color \| Orden | Tabla de horarios |
| **Redes** | Nombre \| Icono \| URL \| Orden | Navbar, contacto y footer |
| **Bitácora** | Fecha \| Tipo de evento \| Estado \| JSON | Log del script |

### Claves de `Sitio`

`nombre`, `lema`, `tituloSEO`, `descripcionSEO`, `telefono`, `whatsapp`, `facebook`,
`instagram`, `messenger`, `direccion1..3`, `mapaUrl`, `mapaEnlace`, `dominio`,
`colorNavbar`, `colorFondo`, `colorSeccion`, `colorTexto`, `colorTextoClaro`,
`colorAcento`, `colorSabado`, `colorDomingo`, `colorContacto`, `licencia`,
`copyright`, `horarioTitulo`, `contactoTitulo`, `programasTitulo`,
`ubicacionTitulo`, `tipografia`.

Los colores se aplican como variables CSS en tiempo de ejecución
(`--color-accent`, `--color-saturday`, …), así que se puede re-tematizar el sitio
sin tocar código.

### `ProgramaDetalle`

- `Tipo = Instrucción` (o `Nota`) → viñetas antes de los ejercicios.
- `Tipo = Ejercicio` (cualquier otro valor) → lista numerada.
- `Programa` debe coincidir exactamente con el título de la pestaña **Programas**.

## Panel de administración

El panel cuenta con dos modos de acceso:

1. **Desde la hoja de cálculo:**
   > Menú **Gymbars → Abrir panel de administración**
   Se muestra como un diálogo flotante (1240 × 860) directo en el contenedor de Sheets.

2. **Desde la Web (computadora o móvil):**
   > Acceder a `?page=admin` o la ruta `#admin`
   Incluye diseño adaptativo (responsive) para teléfonos y tablets.
   
   **Seguridad:** El acceso web está restringido por autenticación con Google (Gmail). El backend valida dinámicamente si el correo verificado tiene permisos sobre la hoja de cálculo de Google Sheets (Propietario, Editor o Lector en `SpreadsheetApp` y `DriveApp`). Si no cuenta con permisos, el panel bloquea la carga y deniega el acceso.

| Pestaña | Qué permite |
| --- | --- |
| **Sitio** | Editar textos, contacto, colores (con selector) y SEO |
| **Imágenes** | Ver el uso de cada referencia, editar URL/recorte, subir archivos y registrarlos |
| **Carrusel** | Agregar, ordenar y quitar diapositivas |
| **Características** | Editar los bloques de la portada |
| **Programas** | Editar rutinas con sus instrucciones y ejercicios en una sola vista |
| **Horario** | Días, turnos y color por día |
| **Redes** | Nombre, icono de Font Awesome y enlace, en orden |
| **Sistema** | Respaldo de la hoja, limpiar caché, revisar imágenes y bitácora |

Detalles de comportamiento:

- Cada pestaña tiene su propio **Guardar cambios**; el punto junto al nombre
  indica cambios sin guardar y se pide confirmación al cambiar de pestaña.
- **Imágenes → Subir** comprime la foto en el navegador (máx. 1600 px, JPEG)
  antes de enviarla, la guarda en la carpeta de Drive configurada, la comparte
  como «Cualquiera con el enlace → Lector» y la registra automáticamente como
  una nueva referencia.
- Cambiar una **Referencia** en Imágenes actualiza automáticamente las
  referencias usadas en Carrusel, Características y Programas.
- Quitar una imagen en uso se permite, pero el panel avisa dónde se estaba usando.
- **Sistema → Revisar imágenes** comprueba en Drive que cada archivo sea imagen y
  tenga permiso público (para enlaces externos hace una petición HTTP).
- Todas las escrituras reescriben la pestaña completa y limpian la caché del sitio.

La carpeta de imágenes se puede cambiar sin tocar código con la propiedad de
script `GYMBARS_IMAGE_FOLDER_ID` (Proyecto → Configuración → Propiedades del script).
Si no existe, se usa la carpeta indicada en la sección **Imágenes**.

## Imágenes

1. Subir los archivos a la carpeta de Drive:
   `My Drive/projects/gymbars/website/resources/images`
   (`122q4COt2Sq-Fs0Gohwqf4m7ly3r_9KqL`).
2. Compartir cada archivo como **Cualquiera con el enlace → Lector**
   (o compartir la carpeta y heredar). Sin esto, `lh3.googleusercontent.com` devuelve 403.
3. En la pestaña **Imágenes**, columna `URL`, pegar el enlace del archivo
   (`https://drive.google.com/file/d/<ID>/view`) o sólo la referencia y su URL.
4. La columna `Posición` controla el recorte (`center`, `top`, `bottom`…) y
   `Ajuste` define `cover` (recorta para llenar) o `contain` (muestra completa,
   ideal para logos y banners).

`convertImageUrl()` en `WebsiteService.gs` transforma los enlaces de Drive a
`https://lh3.googleusercontent.com/d/<ID>` (el formato que sí carga en un `<img>`).

Las imágenes se renderizan con `<img loading="lazy">` y un reintento automático:
Google Drive a veces devuelve una página de error cuando se piden muchas imágenes
en ráfaga, así que tras 3 intentos fallidos se muestra el placeholder de la marca
en lugar de una imagen rota.

> **Estado actual:** las 10 imágenes del sitio ya están en la carpeta de Drive
> (`branding/`, `carousel/`, `gallery/`, `workout/`), compartidas como
> «cualquiera con el enlace» y registradas en la pestaña **Imágenes**.
> Las fotos originales de Firebase Storage siguen en el bucket
> `gymbarsgt.appspot.com` pero no se pueden descargar: el proyecto `gymbarsgt`
> no tiene cuenta de facturación y Cloud Storage responde
> `403 The billing account for the owning project is disabled`
> (ver `tools/fb-storage-pull.mjs`).

## Despliegue

```bash
# 1. Crear el proyecto de Apps Script (script.google.com) y copiar su ID
cp code/.clasp.json.example code/.clasp.json
# editar "scriptId"

# 2. Subir
npx @google/clasp push

# 3. Publicar: Implementar → Nueva implementación → Aplicación web
#    Ejecutar como: Yo · Acceso: Cualquier persona
```

En el editor de Apps Script, ejecutar una vez `setupSheets()` para crear las
pestañas faltantes (la hoja ya viene poblada) y luego implementar el Web App.

> **Importante al actualizar:** `appsscript.json` incluye permisos adicionales:
> `drive` (listar la carpeta y subir imágenes), `script.external_request`
> (comprobar enlaces de imágenes), `script.container.ui` (abrir el panel como
> diálogo) y `script.scriptapp` (obtener la URL del sitio). Al subir esta versión
> hay que **volver a autorizar** el script y publicar una **nueva versión** de la
> implementación; si no, el panel fallará al abrirse o al usar Drive. La
> implementación anterior sigue activa hasta que se crea la nueva versión.
>
> La pestaña **Imágenes** debe tener la columna `Ajuste` (cover/contain). En
> hojas creadas con versiones anteriores, agrégala como quinta columna o vuelve
> a ejecutar `setupSheets()` después de borrar sólo esa pestaña vacía.

Si el script no está vinculado a la hoja, poner el ID en `SPREADSHEET_ID`
(al inicio de `Code.gs`).

## Diferencias con la versión Firebase

| Firebase (actual) | Apps Script (este proyecto) |
| --- | --- |
| Angular 8 + Firebase Hosting | HTML/CSS/JS servido por Apps Script |
| Cloud Firestore (`carousel`, `feature`, `programs`, `schedule`) | Pestañas de Google Sheets |
| Firebase Storage (imágenes) | Google Drive (imágenes) |
| Rutas `/home` del router Angular | Hash routing (`#home`, `#programa/<slug>`) |
| slick-carousel | Carrusel propio (autoplay, flechas, puntos, swipe) |
| Bootstrap 4 + Roboto | CSS propio con variables + Roboto |

## Pendientes sugeridos

- Apuntar el dominio `gymbarsgt.com` al Web App de Apps Script (CNAME de `script.google.com`).
- Revisar el contraste de los colores si se cambia el tema desde el panel.

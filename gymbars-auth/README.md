# Gymbars — Google Sign-In Companion

Esta es una pequeña aplicación web complementaria e independiente en Google Apps Script cuyo único propósito es leer el correo de Google (Gmail) de quien inicia sesión y firmarlo de forma segura con HMAC-SHA256 para el panel de Gymbars.

## ¿Por qué existe y cómo cambiar el nombre a Gymbars?

Cuando un usuario pulsa **"Continuar con Google"**, Google abre una ventana emergente pidiendo permiso para leer el correo (`userinfo.email`). 
En esa ventana, Google muestra:
> **"[Nombre del Proyecto en Apps Script] solicita acceso a tu Cuenta de Google"**

Para que aparezca **Gymbars** en vez de **Swap Store**:

1. Ve a [script.google.com](https://script.google.com) (o directamente abre [script.new](https://script.new)).
2. Asigna como título del proyecto: **Gymbars** (arriba a la izquierda, donde dice *Proyecto sin título*).
3. Reemplaza el archivo `Código.gs` con el contenido de `gymbars-auth/Code.gs`.
4. En la configuración del proyecto (ícono de engranaje ⚙️), activa **"Mostrar archivo de manifiesto 'appsscript.json' en el editor"** y pega el contenido de `gymbars-auth/appsscript.json`.
5. Haz clic en **Implementar > Nueva implementación**:
   - Tipo: **Aplicación web** (ícono de engranaje junto a "Seleccionar tipo").
   - Descripción: `Gymbars Google Auth`
   - Ejecutar como: **El usuario que accede a la aplicación web** (`USER_ACCESSING`).
   - Quién tiene acceso: **Cualquier usuario** (`ANYONE`).
6. Haz clic en **Implementar** y copia la **URL de la aplicación web** (`https://script.google.com/macros/s/.../exec`).
7. En el proyecto principal de Gymbars (`code/Code.gs`), actualiza la variable:
   ```javascript
   var GOOGLE_AUTH_START_URL = 'TU_NUEVA_URL_DE_IMPLEMENTACION';
   ```
8. ¡Listo! A partir de ese momento, la ventana emergente de Google mostrará **Gymbars solicita acceso a tu Cuenta de Google**.

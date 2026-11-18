# Carbe Partners — Radar Inmobiliario

Aplicación web Node.js para analizar oportunidades de inversión inmobiliaria. Compatible con Hostinger Business (Web App → Node.js → Other).

## Publicación continua con GitHub + Hostinger

1. Crea un **repositorio privado** en GitHub llamado `carbe-partners` (sin inicializarlo con otros archivos).
2. Sube **el contenido de esta carpeta** a la raíz del repositorio (`index.html`, `server.js`, `package.json`, etc.). Puedes utilizar **Add file → Upload files**.
3. Hostinger: en el panel de la Web App, abre el menú `⋮` y selecciona **Connect to GitHub** o **Change repository**, según aparezca. Autoriza el acceso solo a este repositorio si es posible. Selecciona `carbe-partners` y la rama `main`.
4. Configura: Node.js 20/22; framework **Other**; directorio raíz `./`; gestor `npm`; **comando de compilación `npm run build` o Ninguno**; directorio de salida vacío; archivo de entrada `server.js`. **Nunca `npm run start` como build**.
5. En Hostinger → Variables de entorno agrega `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4.1`, `NODE_ENV=production`, `APP_USERNAME` y `APP_PASSWORD`. **No pongas claves en GitHub ni en el HTML**. Las variables APP_* activan acceso protegido con usuario y contraseña (HTTP Basic bajo HTTPS).
6. Activa **Auto-deploy** de la rama `main`. Al guardar y subir cambios a esa rama se genera un nuevo despliegue. Confirma su estado en el panel.
7. Abre `https://carbepartners.com/api/health` (o el dominio asignado) y comprueba que responde `ok:true` después de autenticarte. Prueba también la carga de una ficha y el análisis de una URL.

## Desarrollo

- `npm run build` valida la sintaxis del servidor y termina inmediatamente.
- `npm start` arranca el servidor web. **No debe utilizarse como compilación**.
- `node --check server.js` comprueba la sintaxis.

## Límites y seguridad

- Los datos de inmuebles siguen guardándose **en el navegador (localStorage)**. GitHub no los sincroniza ni sustituye una base de datos.
- La IA y los comparables consultan una API de pago; establece límites de consumo en OpenAI. El acceso Basic es una protección inicial, no un sistema completo multiusuario.
- No se garantizan las fichas de portales con bloqueo, ni que todos los comparables estén disponibles. Verifica fuentes y precios.
- Las publicaciones GitHub → Hostinger actualizan el código; **el asistente no puede editar el repositorio hasta que la conexión y los permisos estén habilitados**.
- La versión desplegada mediante ZIP puede requerir conectar o cambiar el repositorio desde el panel Hostinger para habilitar auto-deploy. Haz una copia de cualquier dato alojado en el servidor antes de cambiar de fuente de despliegue.
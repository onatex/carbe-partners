# Carbe Partners — Radar Inmobiliario

Aplicación Node.js para analizar anuncios de inversión inmobiliaria con OpenAI y búsqueda web, con simulaciones de rentabilidad, costes, comparables, seguimiento y análisis financiero.

## Repositorio y despliegue

Código principal: https://github.com/onatex/carbe-partners (repositorio privado). La rama de publicación es `main`.

Para vincularlo con **Hostinger Business**:
1. Ve al panel de tu aplicación web Node.js existente y busca **Conectar GitHub / Cambiar repositorio**. Selecciona `onatex/carbe-partners`, rama `main`, y activa el despliegue automático si Hostinger ofrece la opción.
2. Framework: `Other`; Node.js 20 o 22; raíz: `./`; gestor: `npm`; archivo de entrada: `server.js`.
3. Comando de compilación: `npm run build` (comprobación de sintaxis que termina). **Nunca** `npm start` en compilación. Directorio de salida: vacío.
4. En Hostinger, configura las variables privadas `OPENAI_API_KEY`, `OPENAI_MODEL`, `NODE_ENV=production`, `APP_USERNAME` y `APP_PASSWORD`. No incluyas valores secretos en GitHub.
5. Una vez desplegado, entra en `https://carbepartners.com/api/health` y autentícate con el usuario configurado. Debe responder con `ok:true`. Después prueba una URL de Fotocasa o Yaencontre.

## Scripts

- `npm run build`: comprobación rápida `node --check server.js`.
- `npm start`: arranque del servidor HTTP Node.js.

## Seguridad y límites

- En producción es obligatorio configurar **ambas** `APP_USERNAME` y `APP_PASSWORD`; si faltan, la app deniega el acceso.
- La clave OpenAI solo debe existir en las variables del servidor. Establece límites presupuestarios en OpenAI.
- Los inmuebles y cambios del usuario siguen guardándose localmente en el navegador (`localStorage`); **no están sincronizados entre dispositivos**. La base de datos queda pendiente de implementar.
- Las búsquedas web no garantizan acceso a todos los portales. Los comparables y precios deben verificarse.
- Las actualizaciones en GitHub no llegarán a Hostinger hasta conectar el repositorio y activar el despliegue automático. No se ha confirmado todavía un despliegue remoto exitoso.

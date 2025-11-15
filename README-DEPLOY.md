# Guía de Despliegue

Este proyecto puede desplegarse en **Vercel** para tener acceso completo a las funciones serverless del proxy.

## Opción 1: Desplegar en Vercel (Recomendado)

### Pasos:

1. **Instalar Vercel CLI** (si no lo tienes):
   ```bash
   npm install -g vercel
   ```

2. **Hacer login en Vercel**:
   ```bash
   vercel login
   ```

3. **Desplegar el proyecto**:
   ```bash
   vercel
   ```
   
   Sigue las instrucciones en pantalla. Vercel detectará automáticamente la configuración.

4. **Para producción**:
   ```bash
   vercel --prod
   ```

### Configuración automática:

- Vercel detectará automáticamente el archivo `vercel.json`
- La función serverless en `api/proxy.js` se desplegará automáticamente
- El frontend se construirá y desplegará automáticamente

### Actualizar la URL en el código:

Después del primer despliegue, Vercel te dará una URL como `https://tu-proyecto.vercel.app`. 

Si quieres usar esta URL en otros hosts (como GitHub Pages), actualiza la línea en `src/api.js`:

```javascript
return 'https://tu-proyecto.vercel.app/api';
```

## Opción 2: Desplegar solo el Frontend en GitHub Pages

Si prefieres usar GitHub Pages para el frontend:

1. **Desplegar la función proxy en Vercel** (solo la función):
   - Crea un proyecto nuevo en Vercel
   - Sube solo la carpeta `api/`
   - Obtén la URL de la función

2. **Actualizar `src/api.js`** con la URL de tu función Vercel:
   ```javascript
   return 'https://tu-funcion-proxy.vercel.app/api';
   ```

3. **Desplegar el frontend**:
   ```bash
   npm run deploy
   ```

## Notas importantes:

- El proxy serverless en Vercel tiene un límite de tiempo de ejecución (10 segundos en el plan gratuito)
- Si Cloudflare sigue bloqueando, puede que necesites usar Puppeteer en la función serverless (más complejo y costoso)
- Para desarrollo local, sigue usando `npm run dev:with-proxy`


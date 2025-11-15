# Guía de Despliegue en Cloudflare Workers

Este proyecto ahora usa **Cloudflare Workers** con `@cloudflare/puppeteer` para evitar bloqueos de Cloudflare.

## Ventajas de Cloudflare Workers

- ✅ Soporte nativo para `@cloudflare/puppeteer`
- ✅ Mejor para evitar bloqueos de Cloudflare
- ✅ Plan gratuito generoso
- ✅ Edge computing (muy rápido)

## Pasos para Desplegar

### 1. Instalar Wrangler (CLI de Cloudflare)

```bash
npm install -g wrangler
```

O usar la versión local:
```bash
npm install
```

### 2. Hacer Login en Cloudflare

```bash
wrangler login
```

Esto abrirá tu navegador para autenticarte con Cloudflare.

### 3. Configurar el Worker

Edita `wrangler.toml` y actualiza:
- `name`: El nombre de tu worker
- `routes`: Tu dominio personalizado (opcional)

### 4. Configurar Puppeteer Browser Binding

Cloudflare Workers requiere un binding especial para Puppeteer. Necesitas:

1. **Crear un Browser Binding en Cloudflare Dashboard:**
   - Ve a tu cuenta de Cloudflare
   - Workers & Pages → Create Application
   - En la configuración, agrega un "Browser Binding"
   - Esto te dará un `BROWSER` binding que necesitas usar

2. **O usar el comando de Wrangler:**
   ```bash
   wrangler tail
   ```

### 5. Desplegar el Worker

```bash
npm run worker:deploy
```

O directamente:
```bash
wrangler deploy
```

### 6. Actualizar la URL en el Frontend

Después del despliegue, Cloudflare te dará una URL como:
`https://pokemon-tcg-proxy.your-subdomain.workers.dev`

Actualiza esta URL en `src/api.js`:

```javascript
return 'https://pokemon-tcg-proxy.your-subdomain.workers.dev';
```

### 7. Desplegar el Frontend

El frontend puede seguir desplegándose en Vercel, GitHub Pages, o cualquier otro servicio:

```bash
npm run build
npm run deploy  # Para GitHub Pages
```

## Configuración del Browser Binding

Para que Puppeteer funcione en Cloudflare Workers, necesitas configurar un Browser Binding:

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Workers & Pages → Tu Worker → Settings
3. En "Bindings", agrega un "Browser" binding
4. Esto creará un binding llamado `BROWSER` que el worker usará

## Estructura del Proyecto

```
├── src/
│   ├── worker.js          # Cloudflare Worker (proxy)
│   ├── api.js             # Cliente API (frontend)
│   └── ...
├── wrangler.toml          # Configuración de Cloudflare Workers
├── package.json
└── ...
```

## Desarrollo Local

Para desarrollo local del worker:

```bash
npm run worker:dev
```

Para desarrollo local del frontend con proxy local:

```bash
npm run dev:with-proxy
```

## Notas Importantes

- El Browser Binding de Cloudflare tiene un costo adicional (no está en el plan gratuito)
- Alternativamente, puedes usar solo fetch sin Puppeteer si no necesitas bypass de Cloudflare
- El worker puede desplegarse independientemente del frontend

## Solución de Problemas

Si el worker no puede usar Puppeteer:
1. Verifica que tengas un Browser Binding configurado
2. Verifica que estés usando el plan correcto de Cloudflare
3. Revisa los logs: `wrangler tail`


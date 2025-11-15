import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', // Cloudflare Pages sirve desde la raíz
  plugins: [react()],
  build: {
    outDir: 'dist', // Directorio de salida para el build
    rollupOptions: {
      output: {
        // Asegurar que los archivos JS tengan la extensión correcta
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    // El proxy ahora se maneja mediante un servidor proxy separado (proxy-server.js)
    // que se ejecuta en localhost:3001. Esto evita problemas de detección de proxy.
  },
});
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' && process.env.VERCEL 
    ? '/' 
    : '/Pokemon-TCG-Compare/', // En Vercel no necesitamos el base path
  plugins: [react()],
  build: {
    outDir: 'dist', // Directorio de salida para el build
  },
  server: {
    // El proxy ahora se maneja mediante un servidor proxy separado (proxy-server.js)
    // que se ejecuta en localhost:3001. Esto evita problemas de detección de proxy.
  },
});
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/Pokemon-TCG-Compare/', // Reemplaza con el nombre de tu repositorio
  plugins: [react()],
  build: {
    outDir: 'dist', // Directorio de salida para el build
  },
  server: {
    // El proxy ahora se maneja mediante un servidor proxy separado (proxy-server.js)
    // que se ejecuta en localhost:3001. Esto evita problemas de detección de proxy.
  },
});
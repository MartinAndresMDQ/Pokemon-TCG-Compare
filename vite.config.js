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
    proxy: {
      // Redirige las peticiones de /api a la API de pokemon-zone
      '/api': {
        target: 'https://www.pokemon-zone.com',
        changeOrigin: true, // Necesario para vhosts
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'), // Mantiene /api en la ruta de destino
      },
    },
  },
});
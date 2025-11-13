import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/Pokemon-TCG-Compare/', // Reemplaza con el nombre de tu repositorio
  plugins: [react()],
  build: {
    outDir: 'dist', // Directorio de salida para el build
  },
});
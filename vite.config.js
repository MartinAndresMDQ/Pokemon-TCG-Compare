import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/pokemon-tcg-comparator/', // Reemplaza con el nombre de tu repositorio
  plugins: [react()],
  build: {
    outDir: 'dist', // Directorio de salida para el build
  },
});
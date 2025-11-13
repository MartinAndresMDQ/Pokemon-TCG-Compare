// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // La configuración del servidor y el proxy ya no son necesarios
  // para cargar datos desde archivos JSON locales.
});

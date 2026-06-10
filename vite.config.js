// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,  // Expone en red local para probar desde móvil
  },
  build: {
    target:   'es2020',
    outDir:   'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar Supabase en un chunk propio para mejor cache
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})

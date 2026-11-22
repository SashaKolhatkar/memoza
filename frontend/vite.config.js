import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Vercel builds with the default '/'. GitHub Pages builds set
  // VITE_BASE_PATH=/memoza/ in the workflow.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  server: {
    // 5174 avoids the common local collision on 5173 (many tools bind ::1 there).
    port: 5174,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:8010',
        changeOrigin: true,
      },
    },
  },
})

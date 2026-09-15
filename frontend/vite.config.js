import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/output': {
        target: process.env.BACKEND_URL || 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
})

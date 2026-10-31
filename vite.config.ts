import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [
      'swearingly-pseudocubic-beth.ngrok-free.dev',
      '.ngrok-free.dev',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5105',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

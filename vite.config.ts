import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// API sinkronisasi JSON dilayani oleh `python serve.py` (port API default 8790).
// Saat `npm run dev`, Vite meneruskan /api ke server Python tersebut.
const apiTarget = process.env.SIAGA_API_TARGET ?? 'http://127.0.0.1:8790'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
})

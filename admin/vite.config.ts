import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Get API URL from environment variable or use default
const apiUrl = process.env.VITE_API_URL || 'http://localhost:3000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __API_URL__: JSON.stringify(apiUrl),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiUrl,
        changeOrigin: true,
      },
      '/v1': {
        target: apiUrl,
        changeOrigin: true,
      },
    },
  },
  appType: 'spa',
})
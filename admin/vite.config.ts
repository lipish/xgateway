import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:3001'

  return {
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
        '^/api/': {
          target: apiUrl,
          changeOrigin: true,
        },
        '^/v1/': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
    appType: 'spa',
  }
})

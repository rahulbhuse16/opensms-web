import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const configuredApiOrigin = env.VITE_API_BASE_URL?.trim().match(/^https?:\/\/[^/]+/)?.[0]
  const apiOrigin = configuredApiOrigin ?? 'http://localhost:8080'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/v1': { target: apiOrigin, changeOrigin: true },
      },
    },
  }
})

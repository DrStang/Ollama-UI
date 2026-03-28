import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ollamaTarget = env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/ollama-proxy': {
          target: ollamaTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ollama-proxy/, ''),
        },
      },
    },
  }
})

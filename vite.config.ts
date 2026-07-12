import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    entries: ['index.html']
  },
  server: {
    watch: {
      ignored: ['**/venv/**']
    },
    proxy: {
      '/api/fakeyou': {
        target: 'https://api.fakeyou.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fakeyou/, '')
      }
    }
  }
})

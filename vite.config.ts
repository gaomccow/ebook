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
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('jszip') || id.includes('@fontsource')) {
              return 'vendor-utils';
            }
            return 'vendor-misc';
          }
        }
      }
    }
  }
})

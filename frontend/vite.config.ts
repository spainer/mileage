import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'

export default defineConfig({
  plugins: [vue(), ui()],
  resolve: {
    alias: {
       '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  server: {
    proxy: {
       '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
       },
      },
    },
})

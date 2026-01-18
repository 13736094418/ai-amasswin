import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://api.ai.amasswin.com', // 修改这里
        changeOrigin: true
      }
    }
  }
})

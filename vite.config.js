import { defineConfig } from 'vite';

export default defineConfig({
  base: '/car-showroom/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  }
});

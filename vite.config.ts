// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@utils': path.resolve(__dirname, './utils'),
    },
  },

  // Bảo đảm đường dẫn asset tuyệt đối khi build (tránh 404 ở route con)
  base: '/',

  // Dev/preview thống nhất cổng & mở trên LAN/IPv6
  server: { host: '::', port: 8081, strictPort: true },
  preview: { host: '::', port: 8081, strictPort: true },

  // Bật sourcemap để debug lỗi production (React minified #xxx)
  build: {
    sourcemap: true,
    outDir: 'dist',
    assetsDir: 'assets',
  },

  // Sourcemap cho CSS khi dev
  css: { devSourcemap: true },
});

// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@utils': fileURLToPath(new URL('./utils', import.meta.url)), // alias tới utils ở thư mục gốc
    },
  },
  server: { host: true, port: 8080, strictPort: false },
  preview: { host: true, port: 8080, strictPort: false },
});

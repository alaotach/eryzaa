import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    global: 'globalThis',
    'process.env': {}
  },
  resolve: {
    alias: {
      process: "process/browser",
      buffer: "buffer",
      util: "util"
    }
  }
});

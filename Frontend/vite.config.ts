import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@tanstack/')) {
            return 'vendor-tanstack';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons';
          }
          if (id.includes('/src/data/')) {
            const match = id.match(/\/src\/data\/([^/]+)\.ts/);
            if (match) {
              return `dataset-${match[1]}`;
            }
            return 'starter-datasets';
          }
        },
      },
    },
  },
});

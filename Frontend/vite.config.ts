import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules[\\/](react|react-dom|react-router-dom)[\\/]/.test(id)) return 'react-vendor';
          if (/node_modules[\\/]motion[\\/]/.test(id)) return 'motion-vendor';
          if (/node_modules[\\/]date-fns[\\/]/.test(id)) return 'date-vendor';
        },
      },
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});

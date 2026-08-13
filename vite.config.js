import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: false,
  build: {
    outDir: 'dist',
  },
  server: {
    open: true,
    fs: {
      allow: ['..'],
    },
  },
});

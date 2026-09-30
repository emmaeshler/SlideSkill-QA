import { defineConfig } from 'vite';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function serveBinaryAssets() {
  const types = {
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  return {
    name: 'serve-binary-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const ext = req.url?.match(/(\.\w+)(\?.*)?$/)?.[1];
        if (ext && types[ext]) {
          const rel = req.url.replace(/^\/?/, '');
          const local = resolve(__dirname, rel);
          const parent = resolve(__dirname, '..', rel);
          const file = existsSync(local) ? local : parent;
          if (existsSync(file)) {
            res.setHeader('Content-Type', types[ext]);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            if (ext === '.pptx') {
              res.setHeader('Content-Disposition', `attachment; filename="${file.split('/').pop()}"`);
            }
            res.end(readFileSync(file));
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: false,
  plugins: [serveBinaryAssets()],
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

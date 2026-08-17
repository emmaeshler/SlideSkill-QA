import { defineConfig } from 'vite';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function serveBinaryAssets() {
  const types = { '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
  return {
    name: 'serve-binary-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const ext = req.url?.match(/(\.\w+)(\?.*)?$/)?.[1];
        if (ext && types[ext]) {
          const file = resolve(__dirname, '..', req.url.replace(/^\/?/, ''));
          if (existsSync(file)) {
            res.setHeader('Content-Type', types[ext]);
            res.setHeader('Content-Disposition', `attachment; filename="${file.split('/').pop()}"`);
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

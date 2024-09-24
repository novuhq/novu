import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, './legacy') + '/[!.]*',
          dest: './legacy',
        },
      ],
    }),
    {
      name: 'legacy-redirect',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req?.url?.startsWith('/legacy/') && req.headers['accept']?.includes('text/html')) {
            const legacyPath = path.resolve(__dirname, 'legacy', 'index.html');
            const fileExists = fs.existsSync(legacyPath);

            if (fileExists) {
              // Serve the legacy index.html file
              res.setHeader('Content-Type', 'text/html');
              res.statusCode = 200;
              fs.createReadStream(legacyPath).pipe(res);
              return;
            } else {
              res.statusCode = 404;
              res.end('Legacy index.html not found');
              return;
            }
          }
          next();
        });
      },
    },
  ],
});

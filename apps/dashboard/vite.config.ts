import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { legacyHandler } from './legacy-handler';

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
          legacyHandler(__dirname, req, res, next);
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

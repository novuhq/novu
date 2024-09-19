import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'dashboard',
      remotes: {
        remote_app: {
          external: 'http://localhost:8080/remoteEntry.js',
          externalType: 'url',
          // format: 'systemjs',
          from: 'webpack',
        },
      },
      shared: {
        react: {
          requiredVersion: '18.3.1',
          version: '18.3.1',
        },
        'react-dom': {
          requiredVersion: '18.3.1',
          version: '18.3.1',
        },
        'react-router-dom': {
          requiredVersion: '6.2.2',
          version: '6.2.2',
        },
      },
    }),
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
});

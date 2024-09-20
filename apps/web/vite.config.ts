import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
// import viteTsconfigPaths from 'vite-tsconfig-paths';
import macrosPlugin from 'vite-plugin-babel-macros';

export default defineConfig({
  // depending on your application, base can also be "/"
  base: '',
  plugins: [react(), macrosPlugin()],
  server: {
    // this ensures that the browser opens upon server start
    open: true,
    // this sets a default port to 4200
    port: 4200,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  build: {
    // This causes a OOM error.
    // sourcemap: true,
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        // Supress source map warnings from third-party, refer to libraries https://github.com/vitejs/vite/issues/15012
        if (warning.code === 'SOURCEMAP_ERROR') {
          return;
        }

        defaultHandler(warning);
      },
    },
  },
});

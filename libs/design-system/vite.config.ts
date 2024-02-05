import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { extname, relative, resolve } from 'path';
import { fileURLToPath } from 'node:url';
import dts from 'vite-plugin-dts';
import { libInjectCss } from 'vite-plugin-lib-inject-css';
import { glob } from 'glob';

const LIB_DIR = 'src';

export default defineConfig({
  plugins: [
    react(),
    // ensure CSS is included in build output
    libInjectCss(),
    // generate .d.ts files
    dts({ include: [LIB_DIR] }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, `${LIB_DIR}/index.ts`),
      formats: ['cjs'],
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime'],
      input: Object.fromEntries(
        // https://rollupjs.org/configuration-options/#input
        glob.sync(`${LIB_DIR}/**/*.{ts,tsx}`).map((file) => [
          /*
           * 1. The name of the entry point
           * src/nested/foo.js becomes nested/foo
           */
          relative(LIB_DIR, file.slice(0, file.length - extname(file).length)),
          /*
           * 2. The absolute path to the entry file
           * src/nested/foo.ts becomes /project/src/nested/foo.ts
           */
          fileURLToPath(new URL(file, import.meta.url)),
        ])
      ),
      output: {
        assetFileNames: 'assets/[name][extname]',
        entryFileNames: '[name].js',
      },
    },
  },
});

import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { libInjectCss } from 'vite-plugin-lib-inject-css';

const LIB_DIR = 'src';
const OUTPUT_FORMAT = 'es';

export default defineConfig({
  plugins: [
    react(),

    // ensure CSS is included in build output
    libInjectCss(),
    // generate .d.ts files
    dts({ include: [LIB_DIR] }),
  ],

  build: {
    outDir: `./dist/${OUTPUT_FORMAT}`,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, `${LIB_DIR}/index.ts`),
      fileName: 'index',
      formats: [OUTPUT_FORMAT],
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime.js'],
      // input: Object.fromEntries(
      //   // https://rollupjs.org/configuration-options/#input
      //   glob.sync(`${LIB_DIR}/**/*.{ts,tsx}`).map((file) => [
      //     /*
      //      * 1. The name of the entry point
      //      * src/nested/foo.js becomes nested/foo
      //      */
      //     relative(LIB_DIR, file.slice(0, file.length - extname(file).length)),
      //     /*
      //      * 2. The absolute path to the entry file
      //      * src/nested/foo.ts becomes /project/src/nested/foo.ts
      //      */
      //     fileURLToPath(new URL(file, import.meta.url)),
      //   ])
      // ),
      // output: {
      //   assetFileNames: 'assets/[name][extname]',
      //   entryFileNames: '[name].js',
      // },
    },
  },
});

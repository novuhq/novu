import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import dts from 'vite-plugin-dts';
import { name, version } from './package.json';

const defineConstants = {
  PACKAGE_NAME: JSON.stringify(name),
  PACKAGE_VERSION: JSON.stringify(version),
  __VUE_OPTIONS_API__: JSON.stringify(true),
  __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
};

// Use an environment variable to switch between builds
const buildType = process.env.BUILD_TYPE || 'esm';

export default defineConfig({
  plugins: [
    vue(),
    dts({
      tsConfigFilePath: './tsconfig.json',
      outDir: buildType === 'cjs' ? 'dist/cjs' : 'dist/esm',
      entryRoot: 'src',
      copyDtsFiles: true,
    }),
  ],
  define: defineConstants,
  build: {
    target: buildType === 'cjs' ? 'node14' : 'esnext',
    outDir: buildType === 'cjs' ? 'dist/cjs' : 'dist/esm',
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: [buildType === 'cjs' ? 'cjs' : 'es'],
      fileName: () => (buildType === 'cjs' ? 'index.cjs' : 'index.js'),
    },
    sourcemap: true,
    minify: false,
    rollupOptions: {
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
      external: ['vue'],
    },
    emptyOutDir: false,
  },
});

import { defineConfig, Options } from 'tsup';

const baseConfig: Options = {
  splitting: false,
  sourcemap: false,
  clean: true,
  dts: true,
};

export default defineConfig([
  { ...baseConfig, entry: ['src/index.ts'], format: ['esm', 'cjs'] },
  {
    ...baseConfig,
    entry: { novu: 'src/umd.ts' },
    format: ['iife'],
    minify: true,
    dts: false,
    outExtension: () => {
      return {
        js: '.min.js',
      };
    },
  },
]);

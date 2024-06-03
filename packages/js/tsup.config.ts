import { defineConfig, Options } from 'tsup';
import { name, version } from './package.json';
import { compress } from 'esbuild-plugin-compress';

const isProd = process.env?.NODE_ENV === 'production';

const baseConfig: Options = {
  splitting: false,
  sourcemap: false,
  clean: true,
  dts: true,
  define: { PACKAGE_NAME: `"${name}"`, PACKAGE_VERSION: `"${version}"`, __DEV__: `${!isProd}` },
};

export default defineConfig([
  {
    ...baseConfig,
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    outExtension: ({ format }) => {
      return {
        js: format === 'cjs' ? '.cjs' : '.js',
      };
    },
  },
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
    esbuildPlugins: [
      compress({
        gzip: true,
        brotli: false,
        outputDir: '.',
        exclude: ['**/*.map'],
      }),
    ],
  },
]);

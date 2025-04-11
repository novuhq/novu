import { defineConfig, Options } from 'tsup';
import { name, version } from './package.json';
import { esbuildPluginFilePathExtensions } from 'esbuild-plugin-file-path-extensions';
import vue from 'unplugin-vue/esbuild';

const baseConfig: Options = {
  // we want to preserve the folders structure together with
  // 'use client' directives
  entry: ['src/**/*.{ts,tsx}'],
  minify: false,
  sourcemap: true,
  clean: true,
  dts: true,
  define: {
    PACKAGE_NAME: `"${name}"`,
    PACKAGE_VERSION: `"${version}"`,
    __VUE_OPTIONS_API__: `"true"`,
    __VUE_PROD_DEVTOOLS__: `"false"`,
  },
  external: ['vue'],
};

export default defineConfig([
  {
    ...baseConfig,
    format: 'cjs',
    target: 'node14',
    platform: 'node',
    outDir: 'dist/cjs',
    esbuildPlugins: [vue(), esbuildPluginFilePathExtensions({ cjsExtension: 'cjs' })],
  },
  {
    ...baseConfig,
    format: 'esm',
    target: 'esnext',
    platform: 'browser',
    outDir: 'dist/esm',
    esbuildPlugins: [vue(), esbuildPluginFilePathExtensions({ esmExtension: 'js' })],
    outExtension: () => ({
      js: '.js',
    }),
  },
]);

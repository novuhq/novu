import { esbuildPluginFilePathExtensions } from 'esbuild-plugin-file-path-extensions';
import { defineConfig, Options } from 'tsup';
import { name, version } from './package.json';

const baseConfig: Options = {
  // we want to preserve the folders structure together with
  // 'use client' directives
  entry: ['src/**/*.{ts,tsx}'],
  minify: false,
  sourcemap: true,
  clean: true,
  dts: false,
  define: { PACKAGE_NAME: `"${name}"`, PACKAGE_VERSION: `"${version}"` },
};

export default defineConfig([
  {
    ...baseConfig,
    format: 'cjs',
    target: 'node14',
    platform: 'node',
    outDir: 'dist/cjs',
    esbuildPlugins: [esbuildPluginFilePathExtensions({ cjsExtension: 'js' })],
  },
  {
    ...baseConfig,
    format: 'esm',
    target: 'esnext',
    platform: 'browser',
    outDir: 'dist/esm',
    esbuildPlugins: [esbuildPluginFilePathExtensions({ esmExtension: 'js' })],
    outExtension: () => ({
      js: '.js',
      dts: '.d.ts',
    }),
  },
]);

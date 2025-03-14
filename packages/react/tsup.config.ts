import { defineConfig, Options } from 'tsup';
import { esbuildPluginFilePathExtensions } from 'esbuild-plugin-file-path-extensions';
import { name, version } from './package.json';

const baseConfig: Options = {
  // we want to preserve the folders structure together with
  // 'use client' directives
  entry: ['src/**/*.{ts,tsx}'],
  minify: false,
  sourcemap: true,
  clean: true,
  define: { PACKAGE_NAME: `"${name}"`, PACKAGE_VERSION: `"${version}"` },
  dts: true,
  external: ['react', 'react-dom'],
  format: ['esm', 'cjs'],
  minify: false,
  sourcemap: true,
  target: 'esnext',
};

export default defineConfig([
  {
    ...baseConfig,
    format: 'cjs',
    target: 'node14',
    platform: 'node',
    outDir: 'dist/cjs',
    esbuildPlugins: [esbuildPluginFilePathExtensions({ cjsExtension: 'cjs' })],
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

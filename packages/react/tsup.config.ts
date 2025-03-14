import { defineConfig, Options } from 'tsup';
import { name, version } from './package.json';

const baseConfig: Options = {
  // we want to preserve the folders structure together with
  // 'use client' directives, the combination of bundle: false and entry is required
  entry: ['src/**/*.{ts,tsx}'],
  bundle: false,
  minify: false,
  sourcemap: true,
  clean: true,
  dts: true,
  define: { PACKAGE_NAME: `"${name}"`, PACKAGE_VERSION: `"${version}"` },
};

export default defineConfig([
  {
    ...baseConfig,
    format: 'cjs',
    target: 'node14',
    platform: 'node',
    outDir: 'dist/cjs',
  },
  {
    ...baseConfig,
    format: 'esm',
    target: 'esnext',
    platform: 'browser',
    outDir: 'dist/esm',
    outExtension: () => ({
      js: '.js',
      dts: '.d.ts',
    }),
  },
]);

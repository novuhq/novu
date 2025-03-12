import { defineConfig, Options } from 'tsup';
import { name, version } from './package.json';

const baseConfig: Options = {
  sourcemap: true,
  clean: true,
  dts: true,
  define: { PACKAGE_NAME: `"${name}"`, PACKAGE_VERSION: `"${version}"` },
};

export default defineConfig([
  {
    ...baseConfig,
    entry: ['src/index.ts'], // Entry point for client-side code
    format: ['esm', 'cjs'],
    target: 'esnext',
    platform: 'browser',
    outDir: 'dist/client', // Output directory for client-side build
  },
  {
    ...baseConfig,
    entry: ['src/server.ts'], // Entry point for server-side code
    format: ['esm', 'cjs'],
    target: 'node14', // Target environment for server-side build
    platform: 'node',
    outDir: 'dist/server', // Output directory for server-side build
    splitting: false,
  },
  {
    ...baseConfig,
    entry: ['src/hooks/index.ts'],
    format: ['esm', 'cjs'],
    target: 'esnext',
    platform: 'neutral',
    outDir: 'dist/hooks',
    splitting: false,
  },
  {
    ...baseConfig,
    entry: ['src/themes/index.ts'],
    format: ['esm', 'cjs'],
    target: 'esnext',
    platform: 'neutral',
    outDir: 'dist/themes',
    splitting: false,
  },
]);

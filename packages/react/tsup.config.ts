import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'], // Entry point for client-side code
    format: ['esm', 'cjs'],
    target: 'esnext',
    platform: 'browser',
    outDir: 'dist/client', // Output directory for client-side build
    splitting: true,
    sourcemap: true,
    clean: true,
    dts: true,
  },
  {
    entry: ['src/server.ts'], // Entry point for server-side code
    format: ['esm', 'cjs'],
    target: 'node14', // Target environment for server-side build
    platform: 'node',
    outDir: 'dist/server', // Output directory for server-side build
    splitting: false,
    sourcemap: true,
    clean: true,
    dts: true,
  },
]);

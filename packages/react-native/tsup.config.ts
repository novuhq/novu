import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'], // Entry point for client-side code
    format: ['esm', 'cjs'],
    target: 'esnext',
    outDir: 'dist/client', // Output directory for client-side build
    sourcemap: true,
    clean: true,
    dts: true,
    treeshake: false,
    bundle: false,
  },
]);

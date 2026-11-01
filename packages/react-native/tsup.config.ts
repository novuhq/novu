import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'], // Entry point for client-side code
    format: ['esm', 'cjs'],
    target: 'esnext',
    outDir: 'dist/client', // Output directory for client-side build
    sourcemap: true,
    clean: true,
    // tsup 8 injects the deprecated `baseUrl` option into the dts build
    dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
    treeshake: false,
    bundle: false,
  },
]);

import { defineConfig } from 'tsup';

const themes: string[] = ['notion', 'default'];

export default defineConfig([
  {
    entry: ['src/index.ts', ...themes.map((theme) => `src/themes/${theme}/index.ts`)],
    format: ['esm', 'cjs'],
    target: 'esnext',
    platform: 'browser',
    outDir: 'dist/client', // Output directory for client-side build
    sourcemap: true,
    clean: true,
    dts: true,
  },
]);

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  external: ['react', 'react/jsx-runtime'],
  dts: true,
  clean: true,
});

import { type Options, defineConfig } from 'tsup';

const baseConfig: Options = {
  entry: ['./src/**/*.{ts,tsx,js,jsx}', '!./src/**/*.test.{ts,tsx}'],
  clean: true,
  dts: true,
  shims: true,
};

export default defineConfig([
  {
    ...baseConfig,
    format: 'cjs',
    outDir: 'dist/cjs',
  },
  {
    ...baseConfig,
    format: 'esm',
    outDir: 'dist/esm',
  },
]);

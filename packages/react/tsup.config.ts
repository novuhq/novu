import { defineConfig, Options } from 'tsup';
import { name, version } from './package.json';

const baseConfig: Options = {
  bundle: true,
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
    entry: ['src/index.ts'],
    outDir: 'dist/client/components',
  },
  {
    ...baseConfig,
    entry: ['src/hooks/index.ts'],
    outDir: 'dist/client/hooks',
  },
  {
    ...baseConfig,
    entry: ['src/themes/index.ts'],
    outDir: 'dist/client/themes',
  },
  {
    ...baseConfig,
    entry: ['src/server/index.ts'],
    outDir: 'dist/server',
  },
]);

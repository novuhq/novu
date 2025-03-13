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
  legacyOutput: true,
};

export default defineConfig([
  {
    ...baseConfig,

    entry: ['src/components/index.ts'],
    outDir: 'dist/client',
  },
  {
    ...baseConfig,
    // Preserve original file structure along with the "use client" directives
    bundle: false,
    entry: ['./src/app-router/index.ts', './src/app-router/Inbox.tsx'],
    outDir: 'dist/app-router',
  },
  {
    ...baseConfig,
    entry: ['src/hooks/index.ts'],
    outDir: 'dist/hooks',
  },
  {
    ...baseConfig,
    entry: ['src/themes/index.ts'],
    outDir: 'dist/themes',
  },
]);

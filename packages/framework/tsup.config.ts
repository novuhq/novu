import { defineConfig } from 'tsup';
import { type SupportedFrameworkName } from './src';

const frameworks: SupportedFrameworkName[] = ['h3', 'express', 'next', 'nuxt', 'sveltekit', 'remix', 'lambda', 'nest'];

const baseConfig: Options = {
  entry: ['src/index.ts', 'src/internal/index.ts', ...frameworks.map((framework) => `src/servers/${framework}.ts`)],
  sourcemap: false,
  clean: true,
  treeshake: true,
  dts: true,
  minify: true,
  minifyWhitespace: true,
  minifyIdentifiers: true,
  minifySyntax: true,
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

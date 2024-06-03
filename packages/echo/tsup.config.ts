import { defineConfig } from 'tsup';
import { type SupportedFrameworkName } from './src';

const frameworks: SupportedFrameworkName[] = ['h3', 'express', 'next', 'nuxt'];

export default defineConfig({
  entry: ['src/index.ts', ...frameworks.map((framework) => `src/${framework}.ts`)],
  sourcemap: false,
  clean: true,
  treeshake: true,
  dts: true,
  format: ['cjs', 'esm'],
  minify: true,
  minifyWhitespace: true,
  minifyIdentifiers: true,
  minifySyntax: true,
});

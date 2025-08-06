import { defineConfig, type Options } from 'tsup';
import { version } from './package.json';
import { type SupportedFrameworkName } from './src/internal';

const frameworks: SupportedFrameworkName[] = ['h3', 'express', 'next', 'nuxt', 'sveltekit', 'remix', 'lambda', 'nest'];

const baseConfig: Options = {
  entry: ['src/index.ts', 'src/internal/index.ts', ...frameworks.map((framework) => `src/servers/${framework}.ts`)],
  sourcemap: false,
  clean: true,
  dts: true,
  minify: true,
  minifyWhitespace: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  define: {
    SDK_VERSION: `"${version}"`,
    FRAMEWORK_VERSION: `"2024-06-26"`,
  },
};

export const cjsConfig: Options = {
  ...baseConfig,
  format: 'cjs',
  outDir: 'dist/cjs',
};

export const esmConfig: Options = {
  ...baseConfig,
  format: 'esm',
  outDir: 'dist/esm',
};

export default defineConfig([cjsConfig, esmConfig]);

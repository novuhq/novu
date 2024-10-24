import { type Options, defineConfig } from 'tsup';
import { type SupportedFrameworkName } from './src/internal';

const frameworks: SupportedFrameworkName[] = ['h3', 'express', 'next', 'nuxt', 'sveltekit', 'remix', 'lambda', 'nest'];

const baseConfig: Options = {
  entry: ['src/index.ts', 'src/internal/index.ts', ...frameworks.map((framework) => `src/servers/${framework}.ts`)],
  sourcemap: false,
  clean: true,
  treeshake: true,
  dts: true,
  bundle: false,
  external: ['json-schema-faker'],
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

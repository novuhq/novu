import { defineConfig, type Options } from 'tsup';

const baseConfig: Options = {
  entry: [
    'src/index.ts',
    'src/core/index.ts',
    'src/openai/index.ts',
    'src/langchain/index.ts',
    'src/ai-sdk/index.ts',
    'src/human-in-the-loop/index.ts',
  ],
  sourcemap: false,
  clean: true,
  // tsup 8 injects the deprecated `baseUrl` option into the dts build
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  minify: false,
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

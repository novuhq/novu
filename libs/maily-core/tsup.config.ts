import { defineConfig, Options } from 'tsup';

const packageOptions: Options = {
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: false,
  // tsup 8 injects the deprecated `baseUrl` option into the dts build
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
};

export default defineConfig([
  {
    ...packageOptions,
    entry: {
      index: 'src/index.ts',
    },
    external: ['react'],
    banner: {
      js: "'use client'",
    },
  },
  {
    ...packageOptions,
    entry: {
      index: 'src/blocks.ts',
    },
    external: ['react'],
    outDir: 'dist/blocks',
  },
  {
    ...packageOptions,
    entry: {
      index: 'src/extensions.ts',
    },
    external: ['react'],
    outDir: 'dist/extensions',
  },
]);

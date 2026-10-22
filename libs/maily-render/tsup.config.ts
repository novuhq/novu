import { defineConfig } from 'tsup';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  sourcemap: true,
  // tsup 8 injects the deprecated `baseUrl` option into the dts build
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  clean: true,
  minify: true,
  external: ['react'],
});

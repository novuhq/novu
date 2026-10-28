import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  dts: {
    resolve: ['@novu/agent-event-protocol'],
    // tsup 8 injects the deprecated `baseUrl` option into the dts build
    compilerOptions: { ignoreDeprecations: '6.0' },
  },
  noExternal: ['@novu/agent-event-protocol'],
});

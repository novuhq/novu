import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  dts: {
    resolve: ['@novu/agent-event-protocol'],
  },
  noExternal: ['@novu/agent-event-protocol'],
});

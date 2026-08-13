import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@novu/js': fileURLToPath(new URL('./src/test/novu-js-mock.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    exclude: ['node_modules', 'dist', 'build'],
  },
});

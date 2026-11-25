import { defineConfig } from 'vitest/config';
import { name, version } from './package.json';

export default defineConfig({
  define: {
    PACKAGE_NAME: `"${name}"`,
    PACKAGE_VERSION: `"${version}"`,
  },
  esbuild: {
    jsx: 'automatic',
  },
  // Tests that render the real Inbox load the Solid engine from @novu/js/ui, which needs Solid's browser build
  resolve: {
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}'],
    server: {
      deps: {
        inline: [/solid-js/],
      },
    },
  },
});

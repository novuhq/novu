import swc from 'unplugin-swc';
import { defineConfig, Plugin } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    root: './',
  },
  plugins: [
    // This is required to build the test files with SWC
    swc.vite({
      // Explicitly set the module type to avoid inheriting this value from a `.swcrc` config file
      module: { type: 'es6' },
    }) as Plugin,
  ],
});

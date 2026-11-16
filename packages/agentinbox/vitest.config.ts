import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // picocolors turns color on when CI is set, and the tests expect plain output.
    env: { NO_COLOR: '1' },
  },
});

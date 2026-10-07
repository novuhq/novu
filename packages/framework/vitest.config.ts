/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';
import { version } from './package.json';

export default defineConfig({
  define: {
    SDK_VERSION: `"${version}"`,
    FRAMEWORK_VERSION: `"2024-06-26"`,
  },
});

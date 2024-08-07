import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    alias: {
      '^axios$': 'axios/dist/node/axios.cjs',
      'firebase-admin/app': '<rootDir>/node_modules/firebase-admin/lib/app',
      'firebase-admin/messaging':
        '<rootDir>/node_modules/firebase-admin/lib/messaging',
    },
    transformMode: {
      web: [/\.ts$/],
    },
    exclude: ['node_modules', 'build'],
  },
});

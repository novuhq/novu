import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // NestJS DI relies on emitDecoratorMetadata, which Vitest's default esbuild transform does not emit.
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    server: {
      deps: {
        // date-fns-tz (ESM) imports date-fns v2 by directory path, which native Node ESM rejects.
        inline: ['date-fns-tz'],
      },
    },
  },
});

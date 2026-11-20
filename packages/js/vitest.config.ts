import solid from 'vite-plugin-solid';
import { defineConfig, type Plugin } from 'vitest/config';
import { name } from './package.json';

/**
 * The production build inlines `src/ui/index.css` through `esbuild-plugin-inline-import`
 * (`import css from 'directcss:...'`). Tests do not need the stylesheet, so the import resolves to an empty string.
 */
const directCssStub = (): Plugin => ({
  name: 'novu-directcss-stub',
  resolveId(id) {
    if (id.startsWith('directcss:')) {
      return `\0${id}`;
    }

    return null;
  },
  load(id) {
    if (id.startsWith('\0directcss:')) {
      return 'export default "";';
    }

    return null;
  },
});

export default defineConfig({
  plugins: [solid(), directCssStub()],
  define: {
    NOVU_API_VERSION: '"2024-06-26"',
    PACKAGE_NAME: `"${name}"`,
    PACKAGE_VERSION: '"test"',
    __DEV__: 'true',
    __PREVIEW_LAST_COMMIT_HASH__: '""',
  },
  resolve: {
    conditions: ['development', 'browser'],
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

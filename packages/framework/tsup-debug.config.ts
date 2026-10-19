import { defineConfig } from 'tsup';
import { cjsConfig, esmConfig } from './tsup.config';

export default defineConfig([
  {
    ...cjsConfig,
    sourcemap: true,
    minify: false,
    minifyWhitespace: false,
    minifyIdentifiers: false,
    minifySyntax: false,
    splitting: false,
  },
  {
    ...esmConfig,
    sourcemap: true,
    minify: false,
    minifyWhitespace: false,
    minifyIdentifiers: false,
    minifySyntax: false,
    splitting: false,
  },
]);

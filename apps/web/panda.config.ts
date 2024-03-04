import { defineConfig } from '@pandacss/dev';
import { NovuPandaPreset } from '@novu/design-system';

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  /**
   * https://panda-css.com/docs/guides/component-library#include-the-src-files
   *
   * Per Panda docs, use the above approach if app code lives in an internal monorepo
   */
  include: ['./src/**/*.{js,jsx,ts,tsx}', '../../libs/design-system/src/**/*.{js,jsx,ts,tsx}'],

  // Files to exclude
  exclude: ['**/*.cy.{js,jsx,ts,tsx}', '**/*/styled-system'],

  presets: [NovuPandaPreset],

  /*
   * Any additional configuration that is specific only to `web`.
   * Most things should likely go in the `NovuPandaPreset`, but if there is something
   * theme-oriented that is unique to `web`, include it below
   */
  theme: {
    extend: {},
  },

  // The output directory for your css system
  outdir: './src/styled-system',

  // Enables JSX util generation!
  jsxFramework: 'react',
});

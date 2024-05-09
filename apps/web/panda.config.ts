import { defineConfig } from '@pandacss/dev';
import { novuPandaPreset } from '@novu/novui';

const STYLED_SYSTEM_PATH_BASE = './node_modules/@novu/novui/';

export default defineConfig({
  // use CSS reset
  preflight: true,

  /** Only allow defined values */
  // strictTokens: true,

  /**
   * https://panda-css.com/docs/guides/component-library#include-the-src-files
   *
   * Per Panda docs, use the above approach if app code lives in an internal monorepo
   */
  include: [
    './src/**/*.{js,jsx,ts,tsx}',
    `${STYLED_SYSTEM_PATH_BASE}/dist/**/*.{js,jsx}`,
    // '../../libs/novui/src/**/*.{js,jsx,ts,tsx}',
  ],

  // Files to exclude
  exclude: ['**/*.cy.{js,jsx,ts,tsx}', '**/*/styled-system'],

  presets: [novuPandaPreset],

  /**
   * Prefixes generated classes with the specified string (e.g. `nv-text_blue`)
   * https://panda-css.com/docs/references/config#prefix
   */
  prefix: 'nv',

  /*
   * Any additional configuration that is specific only to `web`.
   * Most things should likely go in the `NovuPandaPreset`, but if there is something
   * theme-oriented that is unique to `web`, include it below
   */
  theme: {
    extend: {},
  },

  outExtension: 'js',

  // TODO: have to confirm this with the panda maintainer
  outdir: `${STYLED_SYSTEM_PATH_BASE}/styled-system`,

  importMap: '@novu/novui',

  // Enables JSX util generation!
  jsxFramework: 'react',
});

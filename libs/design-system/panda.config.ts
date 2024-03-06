import { defineConfig } from '@pandacss/dev';
import { NovuPandaPreset } from './src/panda/NovuPandaPreset';

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ['./src/**/*.{js,jsx,ts,tsx}', './.storybook/**/*.{js,jsx,ts,tsx}'],

  // Files to exclude
  exclude: [],

  presets: [NovuPandaPreset],

  /**
   * Prefixes generated classes with the specified string (e.g. `nv-text_blue`)
   * https://panda-css.com/docs/references/config#prefix
   */
  prefix: 'nv',

  /*
   * Any additional configuration that is specific to design-system, but SHOULD NOT be propagated to
   * other apps or consumers. Use this sparingly!
   */
  theme: {
    extend: {},
  },

  // The output directory for your css system
  outdir: 'styled-system',

  // Enables JSX util generation!
  jsxFramework: 'react',
});

import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ['./src/**/*.{js,jsx,ts,tsx}', './pages/**/*.{js,jsx,ts,tsx}'],

  // Files to exclude
  exclude: [],

  /*
   * remove preset tokens from Panda to ensure that only our tokens are available
   * presets: [],
   */

  // Useful for theme customization
  theme: {
    extend: {
      tokens: {
        fontSizes: {
          '075': {
            value: '0.75rem',
            type: 'fontSize',
          },
          '100': {
            value: '1rem',
            type: 'fontSize',
          },
          '125': {
            value: '1.25rem',
            type: 'fontSize',
          },
        },
      },
    },
  },

  // The output directory for your css system
  outdir: 'styled-system',
});

import { defineConfig } from '@pandacss/dev';
import { novuPandaPreset } from './src/panda-preset';

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  /** Only allow defined values */
  strictTokens: true,

  // Where to look for your css declarations
  include: ['./src/**/*.{js,jsx,ts,tsx}', './.storybook/**/*.{js,jsx,ts,tsx}'],

  // Files to exclude
  exclude: ['./react-scanner.config.js'],

  presets: [novuPandaPreset],

  /**
   * Prefixes generated classes with the specified string (e.g. `nv-text_blue`)
   * https://panda-css.com/docs/references/config#prefix
   */
  prefix: 'nv',

  /*
   * Any additional configuration that is specific to design-system, but SHOULD NOT be propagated to
   * other apps or consumers. Use this sparingly!
   */
  /*
   * Any additional configuration that is specific only to `web`.
   * Most things should likely go in the `NovuPandaPreset`, but if there is something
   * theme-oriented that is unique to `web`, include it below
   */
  theme: {
    extend: {
      tokens: {
        sizes: {
          onboarding: { value: '880px' },
          userSettings: { buttonWidth: { value: '204px' } },
        },
      },
      semanticTokens: {
        colors: {
          workflow: {
            node: {
              surface: {
                value: { base: '{colors.legacy.white}', _dark: '{colors.legacy.B17}' },
                type: 'color',
              },
              connector: {
                value: { base: '{colors.legacy.B40}', _dark: '{colors.legacy.B40}' },
                type: 'color',
              },
            },
            background: {
              dots: {
                value: { base: '{colors.legacy.BGLight}', _dark: '{colors.legacy.B20}' },
                type: 'color',
              },
            },
          },
        },
        spacing: {
          workflow: {
            nodes: {
              gap: {
                value: '{spacing.250}',
                type: 'spacing',
              },
            },
          },
        },
        sizes: {
          workflow: {
            nodes: {
              gap: {
                value: '{spacing.250}',
                type: 'sizes',
              },
            },
          },
        },
      },
    },
  },

  importMap: 'styled-system',

  // extension of generated files
  outExtension: 'js',

  // The output directory for your css system
  outdir: 'styled-system',

  // Enables JSX util generation!
  jsxFramework: 'react',

  validation: 'error',
});

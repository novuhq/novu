import { defineConfig } from '@pandacss/dev';
import { GLOBAL_CSS, novuPandaPreset } from '@novu/novui';

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
  include: ['./src/**/*.{js,jsx,ts,tsx}', `${STYLED_SYSTEM_PATH_BASE}/dist/**/*.{js,jsx}`],

  // Files to exclude
  exclude: ['**/*.spec.{js,jsx,ts,tsx}', '**/*/styled-system'],

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

  outExtension: 'js',

  outdir: `${STYLED_SYSTEM_PATH_BASE}/styled-system`,

  importMap: '@novu/novui',

  globalCss: GLOBAL_CSS,

  // Enables JSX util generation!
  jsxFramework: 'react',
});

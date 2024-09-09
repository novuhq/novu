import { createTheme, Button, Pill, MantineColorsTuple, DefaultMantineColor } from '@mantine/core';

const extendedColors = {
  gradient: ['', '', '', '', '', '', 'linear-gradient(99deg, #DD2476 0%, #FF512F 100%)', '', '', ''],
} as const satisfies Record<string, MantineColorsTuple>;

type ExtendedCustomColors = keyof typeof extendedColors | DefaultMantineColor;

declare module '@mantine/core' {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  export interface MantineThemeColorsOverride {
    colors: Record<ExtendedCustomColors, MantineColorsTuple>;
  }
}

export const themeConfig = createTheme({
  white: '#FFFFFF',
  black: '#000000',
  primaryColor: 'gradient',
  primaryShade: 6,
  components: {
    Button: Button.extend({
      styles: (theme) => ({
        root: {
          borderRadius: theme.radius.md,
        },
      }),
    }),
  },
  colors: {
    gray: [
      '#ededef',
      '#a09fa6',
      '#7e7d86',
      '#706f78',
      '#504f57',
      '#3e3e44',
      '#34343a',
      '#2e2e32',
      '#28282c',
      '#232326',
      '#1c1c1f',
      '#161618',
    ],
    yellow: [
      '#fef3dd',
      '#f1a10d',
      '#ffcb47',
      '#ffb224',
      '#824e00',
      '#693f05',
      '#573300',
      '#4a2900',
      '#3f2200',
      '#341c00',
      '#271700',
      '#1f1300',
    ],
    blue: [
      '#eaf6ff',
      '#52a9ff',
      '#369eff',
      '#0077d4',
      '#0954a5',
      '#0a4481',
      '#0d3868',
      '#0f3058',
      '#102a4c',
      '#10243e',
      '#0f1b2d',
      '#0f1720',
    ],
    green: [
      '#e5fbeb',
      '#4cc38a',
      '#3cb179',
      '#30a46c',
      '#236e4a',
      '#1b543a',
      '#164430',
      '#133929',
      '#113123',
      '#0f291e',
      '#0c1f17',
      '#0d1912',
    ],
    red: [
      '#feecee',
      '#ff6369',
      '#f2555a',
      '#e5484d',
      '#aa2429',
      '#822025',
      '#671e22',
      '#541b1f',
      '#481a1d',
      '#3c181a',
      '#291415',
      '#1f1315',
    ],
    ...extendedColors,
  },
  fontFamily:
    '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
  lineHeights: { sm: '1rem', md: '1.25rem', lg: '1.5rem', xl: '2rem' },
  headings: {
    fontFamily: '"Lato", BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '1.5rem', lineHeight: '2rem' },
      h2: { fontSize: '1.25rem', lineHeight: '1.75rem' },
      h3: { fontSize: '1rem', lineHeight: '1.5rem' },
    },
  },
  fontSizes: { xs: '0.75rem', sm: '0.875rem', md: '1rem', lg: '1.25rem', xl: '1.5rem' },
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', xxl: '2.5rem', xxxl: '3rem' },
  radius: { xs: '0.25rem', sm: '0.375rem', md: '0.5rem', lg: '0.75rem' },
  defaultRadius: 'md',
  shadows: {
    sm: '0px 5px 15px rgba(38, 68, 128, 0.05)',
    md: '0px 5px 15px rgba(122, 133, 153, 0.25)',
    lg: '0px 5px 20px rgba(0, 0, 0, 0.2)',
    xl: '0px 5px 20px -5px rgba(233, 52, 94, 0.5)',
  },
});

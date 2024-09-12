import { createTheme, Button, Pill, MantineColorsTuple, NavLink, Table, Select, SegmentedControl } from '@mantine/core';

const generateColorsArray = (color: string, steps: number = 10): MantineColorsTuple => {
  return Array.from({ length: steps }, () => color) as unknown as MantineColorsTuple;
};

const extendedColors = {
  gradient: ['', '', '', '', '', '', 'linear-gradient(99deg, #DD2476 0%, #FF512F 100%)', '', '', ''],
  primary: generateColorsArray('#EAF6FF'),
  secondary: generateColorsArray('#A09FA6'),
  success: generateColorsArray('#3CB179'),
  error: generateColorsArray('#E72A2A'),
  page: generateColorsArray('#161618'),
  panel: generateColorsArray('#28282C'),
  popover: generateColorsArray('#1C1C1F'),
  menu: generateColorsArray('#232326'),
  segmentedControl: generateColorsArray('#34343A'),
  button: generateColorsArray('#2A92E7'),
  black: generateColorsArray('#000000'),
  white: generateColorsArray('#FFFFFF'),
  dimmed: generateColorsArray('#3E3E44'),
} as const satisfies Record<string, MantineColorsTuple>;

type ExtendedCustomColors = keyof typeof extendedColors;

const colorToken = (color: ExtendedCustomColors) => `var(--mantine-color-${color}-0)`;

declare module '@mantine/core' {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  export interface MantineThemeColorsOverride {
    colors: Record<ExtendedCustomColors, MantineColorsTuple>;
  }
}

export const themeConfig = createTheme({
  white: colorToken('white'),
  black: colorToken('black'),
  primaryColor: 'gradient',
  primaryShade: 6,
  components: {
    Button: Button.extend({
      defaultProps: {
        size: 'sm',
      },
      styles: (theme) => ({
        root: {
          borderRadius: theme.radius.md,
          /*
           * background: 'unset',
           * backgroundColor: colorToken('button'),
           */
        },
      }),
    }),
    NavLink: NavLink.extend({
      styles: (theme) => ({
        root: {
          borderRadius: theme.radius.md,
        },
      }),
      vars: () => ({
        root: {
          '--nl-bg': colorToken('panel'),
          '--nl-hover': colorToken('panel'),
        },
        children: {},
      }),
    }),
    Pill: Pill.extend({
      styles: (theme) => ({
        root: {
          color: theme.white,
          backgroundColor: colorToken('panel'),
        },
      }),
    }),
    Table: Table.extend({
      defaultProps: {
        verticalSpacing: 'md',
      },
      styles: () => ({
        th: {
          fontWeight: 'unset',
        },
      }),
    }),
    Select: Select.extend({
      styles: (theme) => ({
        dropdown: {
          color: theme.white,
          backgroundColor: colorToken('menu'),
        },
        groupLabel: {
          paddingTop: '0.25rem',
          paddingBottom: '0.25rem',
        },
      }),
    }),
    SegmentedControl: SegmentedControl.extend({
      defaultProps: {},
      styles: (theme) => ({
        root: {
          backgroundColor: theme.colors.black[0],
        },
        indicator: {
          backgroundColor: theme.colors.segmentedControl[0],
        },
      }),
    }),
  },
  colors: {
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
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '0.625rem', lg: '1.5rem', xl: '2rem', xxl: '2.5rem', xxxl: '3rem' },
  radius: { xs: '0.25rem', sm: '0.375rem', md: '0.5rem', lg: '1rem' },
  defaultRadius: 'md',
  shadows: {
    sm: '0px 5px 15px rgba(38, 68, 128, 0.05)',
    md: '0px 5px 15px rgba(122, 133, 153, 0.25)',
    lg: '0px 5px 20px rgba(0, 0, 0, 0.2)',
    xl: '0px 5px 20px -5px rgba(233, 52, 94, 0.5)',
  },
});

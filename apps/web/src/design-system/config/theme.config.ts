import { MantineThemeOverride } from '@mantine/core';
import { colors } from './colors';

export const mantineConfig: MantineThemeOverride = {
  spacing: { xs: 15, sm: 20, md: 25, lg: 30, xl: 40 },
  fontFamily: 'Lato, sans serif',
  fontSizes: { xs: 10, sm: 12, md: 14, lg: 16, xl: 18 },
  primaryColor: 'gradient',
  radius: { md: 7 },
  colors: {
    gray: [
      colors.BGLight,
      '#f1f3f5',
      colors.B98,
      '#dee2e6',
      '#ced4da',
      colors.B80,
      colors.B70,
      colors.B60,
      colors.B40,
      colors.B30,
    ],
    dark: [
      '#FFFFFF',
      colors.BGLight,
      colors.B80,
      colors.B40,
      colors.B20,
      colors.B30,
      colors.B40,
      colors.B15,
      colors.BGDark,
      colors.B17,
    ],
    gradient: ['', '', '', '', '', colors.error, colors.horizontal, colors.vertical, colors.horizontal, ''],
  },
  headings: {
    fontFamily: 'Lato, sans-serif',
    sizes: {
      h1: { fontSize: 26 },
      h2: { fontSize: 20 },
    },
  },
};

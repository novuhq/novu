import { MantineColorsTuple, MantineThemeOverride } from '@mantine/core';
import { COLOR_PALETTE_TOKENS } from '../tokens/colors.tokens';
import { token, Token } from '../../styled-system/tokens';

/**
 * Generates a Mantine color tuple for the given Panda color "family"
 */
const generateMantineColorTokens = (colorFamily: keyof typeof COLOR_PALETTE_TOKENS): MantineColorsTuple => {
  return Object.keys(COLOR_PALETTE_TOKENS[colorFamily]).map((paletteNumber) =>
    token(`colors.${colorFamily}.${paletteNumber}.dark` as Token)
  ) as unknown as MantineColorsTuple;
};

/** Maps Panda token values to a mantine theme config */
export const MANTINE_THEME: MantineThemeOverride = {
  // colors
  white: token('colors.legacy.white'),
  black: token('colors.legacy.black'),
  primaryColor: 'gradient',
  primaryShade: 6,
  colors: {
    gray: generateMantineColorTokens('mauve'),
    yellow: generateMantineColorTokens('amber'),
    blue: generateMantineColorTokens('blue'),
    green: generateMantineColorTokens('green'),
    red: generateMantineColorTokens('red'),
    // must have a tuple of 10 strings, but replace the value at primaryShade with our gradient
    gradient: ['', '', '', '', '', '', token('gradients.horizontal'), '', '', ''],
  },

  // typography
  fontFamily: token('fonts.system'),
  fontFamilyMonospace: token('fonts.mono'),
  lineHeights: {
    sm: token('lineHeights.100'),
    md: token('lineHeights.125'),
    lg: token('lineHeights.150'),
    // missing 175
    xl: token('lineHeights.200'),
  },
  headings: {
    fontFamily: token('fonts.system'),
    fontWeight: token('fontWeights.strong'),
    sizes: {
      // page title
      h1: {
        fontSize: token('fontSizes.150'),
        lineHeight: token('lineHeights.200'),
      },
      // section title
      h2: {
        fontSize: token('fontSizes.125'),
        lineHeight: token('lineHeights.175'),
      },
      // subsection title
      h3: {
        fontSize: token('fontSizes.100'),
        lineHeight: token('lineHeights.150'),
      },
    },
  },
  fontSizes: {
    xs: token('fontSizes.75'),
    sm: token('fontSizes.88'),
    md: token('fontSizes.100'),
    lg: token('fontSizes.125'),
    xl: token('fontSizes.150'),
  },

  // TODO: these are guesses for how they match up
  spacing: {
    xs: token('spacing.25'),
    sm: token('spacing.50'),
    md: token('spacing.100'),
    lg: token('spacing.150'),
    xl: token('spacing.200'),
    xxl: token('spacing.250'),
    xxxl: token('spacing.300'),
  },
  radius: {
    xs: token('radii.xs'),
    sm: token('radii.s'),
    md: token('radii.m'),
    lg: token('radii.l'),
  },
  defaultRadius: 'md',
  shadows: {
    // TODO: this makes no sense except for md
    sm: token('shadows.light'),
    md: token('shadows.medium'),
    lg: token('shadows.dark'),
    xl: token('shadows.color'),
  },
};

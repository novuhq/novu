import { defineStyles } from '@pandacss/dev';

/** Must override `bgGradient` property to chose the direction */
export const colorPaletteGradientHorizontal = defineStyles({
  bgGradient: `to-l !important`,
  gradientFrom: 'colorPalette.start !important',
  gradientTo: 'colorPalette.end !important',
});

/** Must override `bgGradient` property to chose the direction */
export const colorPaletteGradientVertical = defineStyles({
  bgGradient: `to-b !important`,
  gradientFrom: 'colorPalette.start !important',
  gradientTo: 'colorPalette.end !important',
});

import { defineStyles } from '@pandacss/dev';

/** Must override `bgGradient` property to chose the direction */
export const colorPaletteGradient = defineStyles({
  bgGradient: `to-l !important`,
  gradientFrom: 'colorPalette.start !important',
  gradientTo: 'colorPalette.end !important',
});

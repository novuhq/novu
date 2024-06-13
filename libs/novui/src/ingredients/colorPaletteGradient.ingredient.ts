import { css } from '../../styled-system/css';

/** Must override `bgGradient` property to chose the direction */
export const colorPaletteGradient = css.raw({
  bgGradient: `to-l !important`,
  gradientFrom: 'colorPalette.start !important',
  gradientTo: 'colorPalette.end !important',
});

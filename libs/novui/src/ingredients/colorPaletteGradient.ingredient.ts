import { css } from '../../styled-system/css';
import {} from '../../styled-system/types';

/** Must override `bgGradient` property to chose the direction */
export const colorPaletteGradient = css.raw({
  bgGradient: `to-l !important`,
  gradientFrom: 'colorPalette.start !important',
  gradientTo: 'colorPalette.end !important',
});

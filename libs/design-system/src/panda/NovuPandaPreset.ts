import { definePreset } from '@pandacss/dev';
import { COLOR_TOKENS } from './colors';
import { SIZES_TOKENS } from './sizes';
import { SPACING_TOKENS } from './spacing';

/**
 * This defines all Novu tokens into a single preset to be used in our various apps (and design-system).
 * https://panda-css.com/docs/customization/presets
 *
 * Future-looking note: this preset and any other associated files may be a good candidate for moving into
 * a standalone package depending on how we interface with Supernova (our design token tool), and if we want
 * the definitions to be separate from token definitions.
 */
export const NovuPandaPreset = definePreset({
  theme: {
    tokens: {
      sizes: SIZES_TOKENS,
      spacing: SPACING_TOKENS,
      colors: COLOR_TOKENS,
    },
  },
});

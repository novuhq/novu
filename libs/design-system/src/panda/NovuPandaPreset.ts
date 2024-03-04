import { definePreset } from '@pandacss/dev';
import { COLOR_PALLETTE_TOKENS, COLOR_SEMANTIC_TOKENS } from './colors';
import { textRecipe } from './recipes/text.recipe';
import { titleRecipe } from './recipes/title.recipe';
import { SIZES_TOKENS } from './sizes';
import { SPACING_TOKENS } from './spacing';
import { TEXT_STYLES } from './textStyles';
import {
  FONT_FAMILY_TOKENS,
  FONT_SIZE_TOKENS,
  FONT_WEIGHT_TOKENS,
  LETTER_SPACING_TOKENS,
  LINE_HEIGHT_TOKENS,
} from './typography';

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
      colors: COLOR_PALLETTE_TOKENS,
      // typography tokens
      fonts: FONT_FAMILY_TOKENS,
      fontSizes: FONT_SIZE_TOKENS,
      lineHeights: LINE_HEIGHT_TOKENS,
      fontWeights: FONT_WEIGHT_TOKENS,
      letterSpacings: LETTER_SPACING_TOKENS,
    },
    semanticTokens: {
      colors: COLOR_SEMANTIC_TOKENS,
    },
    textStyles: TEXT_STYLES,
    extend: {
      recipes: {
        text: textRecipe,
        title: titleRecipe,
      },
    },
  },
});

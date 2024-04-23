import { definePreset } from '@pandacss/dev';
import { COLOR_PALETTE_TOKENS, LEGACY_COLOR_TOKENS } from './colors.tokens';
import { COLOR_SEMANTIC_TOKENS, LEGACY_COLOR_SEMANTIC_TOKENS } from './semanticColors.tokens';
import { TEXT_RECIPE } from './recipes/text.recipe';
import { TITLE_RECIPE } from './recipes/title.recipe';
import { SIZES_TOKENS } from './sizes.tokens';
import { SPACING_TOKENS } from './spacing.tokens';
import { TEXT_STYLES } from './textStyles.tokens';
import {
  FONT_FAMILY_TOKENS,
  FONT_SIZE_TOKENS,
  FONT_WEIGHT_TOKENS,
  LEGACY_FONT_FAMILY_TOKENS,
  LETTER_SPACING_TOKENS,
  LINE_HEIGHT_TOKENS,
} from './typography.tokens';
import { LEGACY_GRADIENT_TOKENS } from './gradients.tokens';
import { LEGACY_SHADOW_TOKENS } from './shadow.tokens';
import { SEMANTIC_SIZES_TOKENS } from './semanticSizes.tokens';

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
      colors: {
        ...COLOR_PALETTE_TOKENS,
        ...LEGACY_COLOR_TOKENS,
      },
      // typography tokens
      fonts: {
        ...FONT_FAMILY_TOKENS,
        ...LEGACY_FONT_FAMILY_TOKENS,
      },
      fontSizes: FONT_SIZE_TOKENS,
      lineHeights: LINE_HEIGHT_TOKENS,
      fontWeights: FONT_WEIGHT_TOKENS,
      letterSpacings: LETTER_SPACING_TOKENS,
    },
    semanticTokens: {
      sizes: SEMANTIC_SIZES_TOKENS,
      colors: {
        ...COLOR_SEMANTIC_TOKENS,
        ...LEGACY_COLOR_SEMANTIC_TOKENS,
      },
      gradients: LEGACY_GRADIENT_TOKENS,
      shadows: LEGACY_SHADOW_TOKENS,
    },
    textStyles: TEXT_STYLES,
    extend: {
      recipes: {
        text: TEXT_RECIPE,
        title: TITLE_RECIPE,
      },
    },
  },
});

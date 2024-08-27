import { definePreset } from '@pandacss/dev';
import { BORDER_TOKENS, BORDER_WIDTH_TOKENS } from './tokens/borders.tokens';
import { COLOR_PALETTE_TOKENS, LEGACY_COLOR_TOKENS } from './tokens/colors.tokens';
import { GRADIENT_TOKENS, LEGACY_GRADIENT_TOKENS } from './tokens/gradients.tokens';
import { LEGACY_RADIUS_TOKENS, RADIUS_TOKENS } from './tokens/radius.tokens';
import { COLOR_SEMANTIC_TOKENS, LEGACY_COLOR_SEMANTIC_TOKENS } from './tokens/semanticColors.tokens';
import { LEGACY_SHADOW_TOKENS } from './tokens/shadow.tokens';
import { SIZES_TOKENS } from './tokens/sizes.tokens';
import { SPACING_TOKENS } from './tokens/spacing.tokens';
import { TEXT_STYLES } from './tokens/textStyles.tokens';
import {
  FONT_FAMILY_TOKENS,
  FONT_SIZE_TOKENS,
  FONT_WEIGHT_TOKENS,
  LEGACY_FONT_FAMILY_TOKENS,
  LETTER_SPACING_TOKENS,
  LINE_HEIGHT_TOKENS,
} from './tokens/typography.tokens';
import { SEMANTIC_FONT_SIZE_TOKENS, SEMANTIC_LINE_HEIGHT_TOKENS } from './tokens/semanticTypography.tokens';
import { Z_INDEX_TOKENS } from './tokens/zIndex.tokens';
import { SEMANTIC_SIZES_TOKENS } from './tokens/semanticSizes.tokens';
import { SEMANTIC_SPACING_TOKENS } from './tokens/semanticSpacing.tokens';
import { SEMANTIC_RADIUS_TOKENS } from './tokens/semanticRadius.tokens';
import { LEGACY_OPACITY_TOKENS, OPACITY_TOKENS } from './tokens/opacity.tokens';
import { SEMANTIC_OPACITY_TOKENS } from './tokens/semanticOpacity.tokens';
import {
  INPUT_RECIPE,
  TEXT_RECIPE,
  TITLE_RECIPE,
  BUTTON_RECIPE,
  TABS_RECIPE,
  SELECT_RECIPE,
  CHECKBOX_RECIPE,
  CODE_BLOCK_RECIPE,
  LOADING_OVERLAY_RECIPE,
  JSON_SCHEMA_FORM_SECTION_RECIPE,
  JSON_SCHEMA_FORM_ARRAY_TOOLBAR_RECIPE,
  VARIABLE_SUGGESTION_LIST_RECIPE,
  INPUT_EDITOR_WIDGET_RECIPE,
} from './recipes';

/**
 * This defines all Novu tokens into a single preset to be used in our various apps (and design-system).
 * https://panda-css.com/docs/customization/presets
 *
 * Future-looking note: this preset and any other associated files may be a good candidate for moving into
 * a standalone package depending on how we interface with Supernova (our design token tool), and if we want
 * the definitions to be separate from token definitions.
 */
export const novuPandaPreset = definePreset({
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
      radii: {
        ...RADIUS_TOKENS,
        ...LEGACY_RADIUS_TOKENS,
      },
      borderWidths: BORDER_WIDTH_TOKENS,
      borders: BORDER_TOKENS,
      zIndex: Z_INDEX_TOKENS,
      opacity: {
        ...OPACITY_TOKENS,
        ...LEGACY_OPACITY_TOKENS,
      },
    },
    semanticTokens: {
      sizes: SEMANTIC_SIZES_TOKENS,
      spacing: SEMANTIC_SPACING_TOKENS,
      colors: {
        ...COLOR_SEMANTIC_TOKENS,
        ...LEGACY_COLOR_SEMANTIC_TOKENS,
      },
      fontSizes: SEMANTIC_FONT_SIZE_TOKENS,
      lineHeights: SEMANTIC_LINE_HEIGHT_TOKENS,
      radii: SEMANTIC_RADIUS_TOKENS,
      shadows: LEGACY_SHADOW_TOKENS,
      gradients: {
        ...GRADIENT_TOKENS,
        ...LEGACY_GRADIENT_TOKENS,
      },
      opacity: SEMANTIC_OPACITY_TOKENS,
    },
    textStyles: TEXT_STYLES,
    extend: {
      recipes: {
        text: TEXT_RECIPE,
        title: TITLE_RECIPE,
        button: BUTTON_RECIPE,
        tabs: TABS_RECIPE,
        input: INPUT_RECIPE,
        select: SELECT_RECIPE,
        checkbox: CHECKBOX_RECIPE,
        codeBlock: CODE_BLOCK_RECIPE,
        loadingOverlay: LOADING_OVERLAY_RECIPE,
        jsonSchemaFormSection: JSON_SCHEMA_FORM_SECTION_RECIPE,
        jsonSchemaFormArrayToolbar: JSON_SCHEMA_FORM_ARRAY_TOOLBAR_RECIPE,
        variableSuggestionList: VARIABLE_SUGGESTION_LIST_RECIPE,
        inputEditorWidget: INPUT_EDITOR_WIDGET_RECIPE,
      },
    },
  },
  conditions: {
    extend: {
      // Mantine uses *-error.
      error: '&:is(:error, [data-error], [aria-error])',
      groupError: '.group:is(:error, [data-error], [aria-error]) &',
      /** Mantine uses hover*ed*, so extend the selector to support it */
      hover: '&:is(:hover, [data-hover], [data-hovered])',
      /** apply hover only when element or child is not disabled */
      hoverNotDisabled: '&:is(:hover, [data-hover], [data-hovered])&:not(:has(:disabled))',
    },
  },
  staticCss: {
    css: [
      {
        properties: {
          // Must generate color modes statically to ensure they're available
          colorPalette: ['mode.local', 'mode.cloud'],
        },
      },
    ],
  },
});

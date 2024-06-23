import { defineSemanticTokens } from '@pandacss/dev';

export const SEMANTIC_FONT_SIZE_TOKENS = defineSemanticTokens.fontSizes({
  button: {
    DEFAULT: { value: '{fontSizes.88}', type: 'fontSizes' },
    small: { value: '{fontSizes.75}', type: 'fontSizes' },
  },
});

export const SEMANTIC_LINE_HEIGHT_TOKENS = defineSemanticTokens.lineHeights({
  sm: { value: '{lineHeights.100}', type: 'lineHeights' },
  md: { value: '{lineHeights.125}', type: 'lineHeights' },
});

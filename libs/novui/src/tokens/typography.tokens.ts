import { defineTokens } from '@pandacss/dev';

export const FONT_FAMILY_TOKENS = defineTokens.fonts({
  system: {
    type: 'fontFamilies',
    value: '-apple-system, "SF Pro Text", BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  },
  mono: {
    type: 'fontFamilies',
    value: 'ui-monospace, "SFMono-Regular", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },
});

/** @deprecated */
export const LEGACY_FONT_FAMILY_TOKENS = defineTokens.fonts({
  system: {
    type: 'fontFamilies',
    value: '"Lato", BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  },
});

export const FONT_SIZE_TOKENS = defineTokens.fontSizes({
  '75': {
    type: 'fontSizes',
    value: '0.75rem',
  },
  '88': {
    type: 'fontSizes',
    value: '0.875rem',
  },
  '100': {
    type: 'fontSizes',
    value: '1rem',
  },
  '125': {
    type: 'fontSizes',
    value: '1.25rem',
  },
  '150': {
    type: 'fontSizes',
    value: '1.5rem',
  },
  '175': {
    type: 'fontSizes',
    value: '1.75rem',
  },
  '225': {
    type: 'fontSizes',
    value: '2.25rem',
  },
});

export const FONT_WEIGHT_TOKENS = defineTokens.fontWeights({
  regular: {
    type: 'fontWeights',
    value: '400',
  },
  strong: {
    type: 'fontWeights',
    value: '600',
  },
});

export const LETTER_SPACING_TOKENS = defineTokens.letterSpacings({
  '0': {
    type: 'letterSpacing',
    value: '0',
  },
});

export const LINE_HEIGHT_TOKENS = defineTokens.lineHeights({
  '100': {
    type: 'lineHeights',
    value: '1rem',
  },
  '125': {
    type: 'lineHeights',
    value: '1.25rem',
  },
  '150': {
    type: 'lineHeights',
    value: '1.5rem',
  },
  '175': {
    type: 'lineHeights',
    value: '1.75rem',
  },
  '200': {
    type: 'lineHeights',
    value: '2rem',
  },
  '225': {
    type: 'lineHeights',
    value: '2.25rem',
  },
  '300': {
    type: 'lineHeights',
    value: '3rem',
  },
});

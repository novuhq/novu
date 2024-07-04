import { defineSemanticTokens } from '@pandacss/dev';

/**
 * Represents the size of an element.
 *
 * Used for properties like width and height.
 */
export const SEMANTIC_RADIUS_TOKENS = defineSemanticTokens.radii({
  xs: {
    value: '{radii.50}',
    type: 'radius',
  },
  s: {
    value: '{radii.75}',
    type: 'radius',
  },
  m: {
    value: '{radii.100}',
    type: 'radius',
  },
  l: {
    value: '{radii.150}',
    type: 'radius',
  },
  input: {
    value: '{radii.100}',
    type: 'radius',
  },
});

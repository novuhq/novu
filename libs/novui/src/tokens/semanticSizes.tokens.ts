import { defineSemanticTokens } from '@pandacss/dev';

/**
 * Represents a dimension of an element.
 *
 * Used for properties like width and height.
 */
export const SEMANTIC_SIZES_TOKENS = defineSemanticTokens.sizes({
  components: {
    input: {
      height: {
        // TODO: this is a legacy value and can be replaced when a new value is determined.
        value: `50px`,
        type: 'sizes',
      },
    },
  },
  icon: {
    '16': {
      value: '{sizes.100}',
      type: 'sizes',
    },
    '20': {
      value: '{sizes.125}',
      type: 'sizes',
    },
    '24': {
      value: '{sizes.150}',
      type: 'sizes',
    },
  },
  full: {
    value: '100%',
    type: 'sizes',
  },
  // From Figma
  s: {
    value: '{sizes.200}',
    type: 'sizes',
  },
  m: {
    value: '{sizes.250}',
    type: 'sizes',
  },
  l: {
    value: '{sizes.300}',
    type: 'sizes',
  },
});

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
});

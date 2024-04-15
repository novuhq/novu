import { defineSemanticTokens } from '@pandacss/dev';
import { INPUT_HEIGHT_PX } from '../config/inputs.styles';

/**
 * Represents a dimension of an element.
 *
 * Used for properties like width and height.
 */
export const SEMANTIC_SIZES_TOKENS = defineSemanticTokens.sizes({
  components: {
    input: {
      height: {
        value: `${INPUT_HEIGHT_PX}px`,
        type: 'sizes',
      },
    },
  },
});

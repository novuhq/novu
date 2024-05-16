import { defineSemanticTokens } from '@pandacss/dev';

/**
 * Semantic uses of spacing. May target an individual component or spacing between components.
 */
export const SEMANTIC_SPACING_TOKENS = defineSemanticTokens.spacing({
  molecules: {
    form: {
      input: {
        button: {
          value: `{spacing.150}`,
          description: 'Distance between an input and its submit button',
          type: 'spacing',
        },
      },
    },
  },
});

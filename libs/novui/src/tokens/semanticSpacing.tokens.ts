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
  page: {
    padding: {
      value: `{spacing.150}`,
      description: 'The space around page content',
      type: 'spacing',
    },
    majorElements: {
      value: `{spacing.150}`,
      description: 'The spacing between major elements in a page',
      type: 'spacing',
    },
  },
});

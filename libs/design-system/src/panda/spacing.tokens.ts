import { defineTokens } from '@pandacss/dev';

/**
 * Determines distances between elements.
 *
 * Used for properties like margin and padding.
 */
export const SPACING_TOKENS = defineTokens.spacing({
  '25': {
    value: '0.25rem',
    type: 'spacing',
  },
  '50': {
    value: '0.5rem',
    type: 'spacing',
  },
  '75': {
    value: '0.75rem',
    type: 'spacing',
  },
  '100': {
    value: '1rem',
    type: 'spacing',
  },
  '125': {
    value: '1.25rem',
    type: 'spacing',
  },
  '150': {
    value: '1.5rem',
    type: 'spacing',
  },
  '175': {
    value: '1.75rem',
    type: 'spacing',
  },
  '200': {
    value: '2rem',
    type: 'spacing',
  },
});

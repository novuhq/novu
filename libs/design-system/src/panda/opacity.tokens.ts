import { defineTokens } from '@pandacss/dev';

/**
 * Represents the size of an element.
 *
 * Used for properties like width and height.
 */
export const OPACITY_TOKENS = defineTokens.opacity({
  '0': {
    value: '0',
    type: 'opacity',
  },
  '40': {
    value: '40%',
    type: 'opacity',
  },
  '80': {
    value: '80%',
    type: 'opacity',
  },
  '100': {
    value: '100%',
    type: 'opacity',
  },
});

/** @deprecated */
export const LEGACY_OPACITY_TOKENS = defineTokens.radii({
  '20': {
    value: '20%',
    type: 'opacity',
  },
  '50': {
    value: '50%',
    type: 'opacity',
  },
  '60': {
    value: '60%',
    type: 'opacity',
  },
});

import { defineTokens } from '@pandacss/dev';

/**
 * Represents the size of an element.
 *
 * Used for properties like width and height.
 */
export const RADIUS_TOKENS = defineTokens.radii({
  '0': {
    value: '0',
    type: 'radius',
  },
  '50': {
    value: '0.25rem',
    type: 'radius',
  },
  '75': {
    value: '0.375rem',
    type: 'radius',
  },
  '100': {
    value: '0.5rem',
    type: 'radius',
  },
  '150': {
    value: '0.75rem',
    type: 'radius',
  },
  circle: {
    value: '50%',
    type: 'radius',
  },
  pill: {
    value: '9999px',
    type: 'radius',
  },
});

/** @deprecated */
export const LEGACY_RADIUS_TOKENS = defineTokens.radii({
  '63': {
    value: '5px',
    type: 'radius',
  },
  '88': {
    value: '7px',
    type: 'radius',
  },
});

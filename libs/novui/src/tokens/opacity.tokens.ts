import { defineTokens } from '@pandacss/dev';

export const OPACITY_TOKENS = defineTokens.opacity({
  '0': {
    value: '0',
    type: 'opacity',
  },
  '40': {
    value: '0.4',
    type: 'opacity',
  },
  '80': {
    value: '0.8',
    type: 'opacity',
  },
  '100': {
    value: '1',
    type: 'opacity',
  },
});

/** @deprecated */
export const LEGACY_OPACITY_TOKENS = defineTokens.opacity({
  '20': {
    value: '0.2',
    type: 'opacity',
  },
  '50': {
    value: '0.5',
    type: 'opacity',
  },
  '60': {
    value: '0.6',
    type: 'opacity',
  },
});

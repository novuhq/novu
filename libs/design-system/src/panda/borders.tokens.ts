import { defineTokens } from '@pandacss/dev';

export const BORDER_WIDTH_TOKENS = defineTokens.borderWidths({
  '0': {
    value: '0',
    type: 'borderWidth',
  },
  '100': {
    value: '1px',
    type: 'borderWidth',
  },
  '200': {
    value: '2px',
    type: 'borderWidth',
  },
});

export const BORDER_TOKENS = defineTokens.borders({
  none: {
    value: 'none',
    type: 'border',
  },
  solid: {
    value: '{borderWidths.100} solid',
    type: 'border',
  },
  double: {
    value: '{borderWidths.200} solid',
    type: 'border',
  },
  dashed: {
    value: '{borderWidths.100} dashed',
    type: 'border',
  },
});

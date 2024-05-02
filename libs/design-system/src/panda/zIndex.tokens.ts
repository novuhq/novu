import { defineTokens } from '@pandacss/dev';

/**
 * Specifies the "depth" of UI elements.
 * Note: Z Indices are a little strange because the concept of base vs semantic token is blurred.
 *
 * Based on the system from ParkUI:
 * https://github.com/cschroeter/park-ui/blob/main/plugins/panda/src/theme/tokens/z-index.ts
 * It’s similar to the system from MUI as well: https://mui.com/material-ui/customization/z-index/
 */
export const Z_INDEX_TOKENS = defineTokens.zIndex({
  hide: {
    value: '-1',
    type: 'zIndex',
  },
  auto: {
    value: 'auto',
    type: 'zIndex',
  },
  base: {
    value: '0',
    type: 'zIndex',
  },
  docked: {
    value: '10',
    type: 'zIndex',
  },
  dropdown: {
    value: '1000',
    type: 'zIndex',
  },
  sticky: {
    value: '1100',
    type: 'zIndex',
  },
  banner: {
    value: '1200',
    type: 'zIndex',
  },
  overlay: {
    value: '1300',
    type: 'zIndex',
  },
  modal: {
    value: '1400',
    type: 'zIndex',
  },
  popover: {
    value: '1500',
    type: 'zIndex',
  },
  skipLink: {
    value: '1600',
    type: 'zIndex',
  },
  toast: {
    value: '1700',
    type: 'zIndex',
  },
  tooltip: {
    value: '1800',
    type: 'zIndex',
  },
});

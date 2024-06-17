import { InputStylesNames } from '@mantine/core';
import { defineSlotRecipe } from '@pandacss/dev';

const SLOTS: InputStylesNames[] = ['input', 'wrapper', 'section'];

export const INPUT_RECIPE = defineSlotRecipe({
  className: 'input',
  jsx: ['Input'],
  slots: SLOTS,
  base: {
    input: {
      // default color palette
      colorPalette: 'mode.cloud',
      _disabled: {
        opacity: 'disabled',
      },
      '&:hover:not(:disabled)': {
        opacity: 'hover',
      },

      _active: {
        color: 'typography.text.main !important',
        '& svg': {
          color: 'typography.text.main !important',
        },
        border: 'double',
        borderColor: 'colorPalette.start !important',
      },

      _hover: {
        background: 'none !important',
        color: 'typography.text.main !important',
        '& svg': {
          color: 'typography.text.main !important',
        },
      },
    },
    wrapper: {},
    section: {},
  },
});

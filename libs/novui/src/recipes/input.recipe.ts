import { InputStylesNames, InputWrapperStylesNames } from '@mantine/core';
import { defineSlotRecipe } from '@pandacss/dev';

const SLOTS: (InputStylesNames | InputWrapperStylesNames)[] = [
  'root',
  'input',
  'wrapper',
  'section',
  'description',
  'error',
  'required',
  'label',
];

export const INPUT_RECIPE = defineSlotRecipe({
  className: 'input',
  jsx: ['Input'],
  slots: SLOTS,
  base: {
    input: {
      background: 'input.surface !important',
      // borderColor: 'input.border.default !important',
      borderRadius: 'input !important',
      lineHeight: '125 !important',
      color: 'typography.text.main !important',
      '& svg': {
        color: 'typography.text.main !important',
      },

      marginTop: 'margins.layout.Input.titleBottom',
      paddingX: '75 !important',
      paddingTop: '100 !important',
      paddingBottom: '100 !important',
      height: 'auto !important',

      _disabled: {
        bg: 'input.surface.disabled !important',
        borderColor: 'input.border.disabled !important',
      },
      '&:hover:not(:disabled)': {
        opacity: 'hover',
      },

      _invalid: {
        border: 'solid !important',
        borderColor: 'input.border.error !important',
      },

      '&:focus,&:focus-within': {
        outline: 'solid !important',
        outlineColor: 'input.border.active !important',
        _invalid: {
          borderColor: 'input.border.error !important',
          outlineColor: 'input.border.active !important',
        },
      },
      _placeholder: {
        color: 'typography.text.secondary',
      },

      _hover: {
        background: 'none !important',
      },
    },
    label: {
      color: 'typography.text.main',
      fontWeight: 'strong !important',
      fontSize: '88 !important',
    },
    error: {
      // TODO: figure out about the typography error token
      color: 'input.border.error !important',
      fontSize: '75 !important',
      paddingTop: '50 !important',
    },
    wrapper: {},
    section: { paddingRight: '75' },
    description: {
      color: 'typography.text.tertiary !important',
      fontSize: '88 !important',
    },
  },
});

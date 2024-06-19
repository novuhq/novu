import { InputStylesNames, InputWrapperStylesNames } from '@mantine/core';
import { defineSlotRecipe } from '@pandacss/dev';

// full enumeration of the component library's slots
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
    root: {
      // add gap between label and description when both are present
      '& .nv-input__label + .nv-input__description': {
        marginTop: '25 !important',
      },
      // add gap between description or label and the input
      '& .nv-input__description + .nv-input__wrapper, & .nv-input__label + .nv-input__wrapper': {
        marginTop: 'margins.layout.Input.titleBottom !important',
      },
    },
    input: {
      background: 'input.surface !important',
      borderColor: 'input.border.default !important',
      borderRadius: 'input !important',
      lineHeight: '125 !important',

      '&, & svg': {
        color: 'typography.text.main !important',
      },

      paddingX: '75 !important',
      paddingTop: '100 !important',
      paddingBottom: '100 !important',
      height: 'auto !important',

      _disabled: {
        '&, &:hover': {
          bg: 'input.surface.disabled !important',
        },
        borderColor: 'input.border.disabled !important',
      },

      _error: {
        '&, &:focus, &:focus-within': {
          border: 'solid !important',
          borderColor: 'input.border.error !important',
        },
      },

      '&:focus, &:focus-within': {
        outline: 'none !important',
        border: 'solid !important',
        borderColor: 'input.border.active !important',
      },

      _placeholder: {
        color: 'typography.text.secondary !important',
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
    section: {
      paddingRight: '75',
      '[data-error] &': {
        '&, & svg': {
          color: 'input.border.error !important',
        },
      },
    },
    description: {
      color: 'typography.text.tertiary !important',
      fontSize: '88 !important',
    },
  },
});

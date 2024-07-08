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
  jsx: ['Input', 'Textarea'],
  slots: SLOTS,
  base: {
    root: {
      // add gap between label and description when both are present
      '& > label + p': {
        marginTop: '25 !important',
      },
      // add gap between description or label and the input
      '& > p + div, & > label + div': {
        marginTop: 'margins.layout.Input.titleBottom !important',
      },
    },
    input: {
      background: 'input.surface !important',
      borderColor: 'input.border !important',
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
      color: 'typography.text.main !important',
      fontWeight: 'strong !important',
      fontSize: '88 !important',
    },
    error: {
      // TODO: figure out about the typography error token
      color: 'input.border.error !important',
      fontSize: '75 !important',
      lineHeight: '100 !important',
      paddingTop: 'margins.layout.Input.error.top !important',
    },
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
    required: {
      color: 'typography.text.feedback.required !important',
    },
    wrapper: {
      // prevent Mantine from injecting 2px margin that causes layout shift
      marginBottom: '0 !important',
    },
  },
  variants: {
    variant: {
      // TODO: determine if we want this built-in! Prevents layout shift with error states
      preventLayoutShift: {
        root: {
          paddingBottom: `[calc(token(lineHeights.100) + token(spacing.margins.layout.Input.error.bottom)
             + token(spacing.margins.layout.Input.error.top)) !important]`,

          _error: {
            // remove the bottom padding when occupied by an error message
            paddingBottom: '0 !important',
          },
        },
        error: {
          paddingBottom: 'margins.layout.Input.error.bottom !important',
        },
      },
    },
  },
  defaultVariants: { variant: undefined },
});

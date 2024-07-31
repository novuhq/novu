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
        marginTop: '25',
      },
      // add gap between description or label and the input
      '& > p + div, & > label + div': {
        marginTop: 'margins.layout.Input.titleBottom',
      },
      border: 'none',
    },
    input: {
      background: 'input.surface',
      border: 'solid',
      borderColor: 'input.border',
      borderRadius: 'input',
      lineHeight: '125',

      '&, & svg': {
        color: 'typography.text.main',
      },

      paddingX: '75',
      paddingTop: '100',
      paddingBottom: '100',
      height: 'auto',

      _disabled: {
        '&, &:hover': {
          bg: 'input.surface.disabled',
        },
        borderColor: 'input.border.disabled',
      },

      _error: {
        '&, &:focus, &:focus-within': {
          border: 'solid',
          borderColor: 'input.border.error',
        },
      },

      '&:focus, &:focus-within': {
        outline: 'none',
        border: 'solid',
        borderColor: 'input.border.active',
      },

      _placeholder: {
        color: 'typography.text.secondary',
      },

      _hover: {
        background: 'none',
      },
    },
    label: {
      color: 'typography.text.main',
      fontWeight: 'strong',
      fontSize: '88',
    },
    error: {
      // TODO: figure out about the typography error token
      color: 'input.border.error',
      fontSize: '75',
      lineHeight: '100',
      paddingTop: 'margins.layout.Input.error.top',
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
      color: 'typography.text.tertiary',
      fontSize: '88',
    },
    required: {
      color: 'typography.text.feedback.required',
    },
    wrapper: {
      // prevent Mantine from injecting 2px margin that causes layout shift
      marginBottom: '0',
    },
  },
  variants: {
    variant: {
      // TODO: determine if we want this built-in! Prevents layout shift with error states
      preventLayoutShift: {
        root: {
          paddingBottom: `[calc(token(lineHeights.100) + token(spacing.margins.layout.Input.error.bottom)
             + token(spacing.margins.layout.Input.error.top))]`,

          _error: {
            // remove the bottom padding when occupied by an error message
            paddingBottom: '0',
          },
        },
        error: {
          paddingBottom: 'margins.layout.Input.error.bottom',
        },
      },
    },
  },
  defaultVariants: { variant: undefined },
});

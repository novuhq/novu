import { ButtonStylesNames } from '@mantine/core';
import { defineSlotRecipe } from '@pandacss/dev';
import { colorPaletteGradientHorizontal, colorPaletteGradientText } from '../ingredients';

const SLOTS: ButtonStylesNames[] = ['root', 'inner', 'label', 'loader', 'section'];

export const BUTTON_RECIPE = defineSlotRecipe({
  className: 'button',
  jsx: ['Button'],
  slots: SLOTS,
  base: {
    root: {
      height: 'max-content !important',
      _disabled: {
        opacity: 'disabled',
      },
      '&:hover:not(:disabled)': {
        opacity: 'hover',
      },

      minWidth: '[fit-content]',
    },
    label: {
      color: 'typography.text.main',
      minWidth: '[fit-content]',
      lineClamp: '1',
      lineHeight: 'md',
    },
    section: {
      marginRight: '25',
    },
  },
  defaultVariants: { size: 'md', variant: 'filled', fullWidth: false },
  variants: {
    size: {
      xs: {
        root: {
          '&:not([data-variant="transparent"])': {
            px: '50 !important',
          },
          py: '25 !important',
          fontSize: 'button.small',
        },
        label: {
          lineHeight: 'sm',
        },
      },
      sm: {
        root: {
          '&:not([data-variant="transparent"])': {
            px: '75 !important',
          },
          py: '25 !important',
        },

        label: {
          fontSize: 'button.small !important',
          lineHeight: 'md',
        },
      },
      md: {
        root: {
          '&:not([data-variant="transparent"])': {
            px: '100 !important',
          },
          py: '50 !important',
          borderRadius: '100 !important',
        },
        label: {
          fontSize: 'button',
        },
        section: {
          marginRight: '50 !important',
        },
      },
      lg: {
        root: {
          '&:not([data-variant="transparent"])': {
            px: '150 !important',
          },
          py: '75 !important',
          borderRadius: '150 !important',
        },
        label: {
          fontSize: 'button',
        },
        section: {
          marginRight: '75 !important',
        },
      },
    },
    variant: {
      filled: {
        root: { ...colorPaletteGradientHorizontal, border: '[none !important]' },
        label: {
          color: 'button.text.filled',
        },
        section: {
          '& svg': {
            color: 'button.text.filled !important',
          },
        },
      },
      outline: {
        root: {
          border: 'solid !important',
          borderColor: 'colorPalette.middle !important',
          bg: 'button.secondary.background',

          boxShadow: 'medium',
          _disabled: {
            bg: '[transparent !important]',
          },
          _loading: {},

          // icon button
          '& svg': {
            color: 'colorPalette.middle !important',
          },
        },
        label: {
          ...colorPaletteGradientText,
        },
        section: {
          color: 'colorPalette.middle !important',
          '& svg': {
            color: 'colorPalette.middle !important',
          },
        },
        loader: {
          color: 'colorPalette.start',
          borderColor: 'legacy.white !important',
        },
      },
      transparent: {
        root: {
          border: 'none !important',
          bg: '[transparent !important]',
          px: '0 !important',
        },
        label: {
          ...colorPaletteGradientText,
        },
        section: {
          ...colorPaletteGradientHorizontal,
          borderRadius: '50 !important',
          // required to create adequate space around an icon
          padding: '[2px !important]',
          marginRight: '50 !important',
          '& svg': {
            fill: 'button.icon.filled !important',
          },
        },
      },
    },
    fullWidth: {
      false: {
        root: {
          width: 'fit-content !important',
        },
      },
      true: {
        root: {
          width: 'full !important',
        },
      },
    },
  },
});

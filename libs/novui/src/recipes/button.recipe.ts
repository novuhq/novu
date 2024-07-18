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
      height: 'max-content',
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
            px: '50',
            pt: '25',
            pb: '25',
            fontSize: 'button.small',
          },
        },
        label: {
          lineHeight: 'sm',
        },
      },
      sm: {
        root: {
          '&:not([data-variant="transparent"])': {
            px: '75',
            pt: '25',
            pb: '25',
          },
        },

        label: {
          fontSize: 'button.small',
          lineHeight: 'md',
        },
      },
      md: {
        root: {
          '&:not([data-variant="transparent"])': {
            px: '100',
            pt: '50',
            pb: '50',
            borderRadius: '100',
          },
        },
        label: {
          fontSize: 'button',
        },
        section: {
          marginRight: '50',
        },
      },
      lg: {
        root: {
          '&:not([data-variant="transparent"])': {
            px: '150',
            pt: '75',
            pb: '75',
            borderRadius: '150',
          },
        },
        label: {
          fontSize: 'button',
        },
        section: {
          marginRight: '75',
        },
      },
    },
    variant: {
      filled: {
        root: { ...colorPaletteGradientHorizontal, border: '[none]' },
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
          border: 'solid',
          borderColor: 'colorPalette.middle',
          bg: 'button.secondary.background',

          boxShadow: 'medium',
          _disabled: {
            bg: '[transparent]',
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
          color: 'colorPalette.middle',
          '& svg': {
            color: 'colorPalette.middle !important',
          },
        },
        loader: {
          color: 'colorPalette.start',
          borderColor: 'legacy.white',
        },
      },
      transparent: {
        root: {
          border: 'none',
          borderRadius: '0',
          bg: '[transparent]',
          px: '0',
        },
        label: {
          ...colorPaletteGradientText,
        },
        section: {
          ...colorPaletteGradientHorizontal,
          borderRadius: '50',
          // required to create adequate space around an icon
          padding: '[2px]',
          marginRight: '50',
          '& svg': {
            fill: 'button.icon.filled',
          },
        },
      },
    },
    fullWidth: {
      false: {
        root: {
          width: 'fit-content',
        },
      },
      true: {
        root: {
          width: 'full',
        },
      },
    },
  },
});

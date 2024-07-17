import { CheckboxStylesNames } from '@mantine/core';
import { defineSlotRecipe } from '@pandacss/dev';
import { colorPaletteGradientHorizontal } from '../ingredients';
import { INPUT_RECIPE } from './input.recipe';

// full enumeration of the component library's slots
const SLOTS: CheckboxStylesNames[] = [
  'root',
  'body',
  'input',
  'description',
  'error',
  'label',
  'icon',
  'inner',
  'labelWrapper',
];

export const CHECKBOX_RECIPE = defineSlotRecipe({
  className: 'checkbox',
  jsx: ['Checkbox'],
  slots: SLOTS,
  base: {
    ...INPUT_RECIPE.base,
    root: {
      _hoverNotDisabled: {
        opacity: 'hover',
        '& input, & label': {
          cursor: 'pointer',
        },
      },
    },
    icon: {
      color: 'button.icon.filled',
    },
    input: {
      border: 'solid',
      borderColor: 'input.border',
      borderRadius: '50',
      background: 'transparent',

      _checked: {
        ...colorPaletteGradientHorizontal,
        color: 'typography.text.main',
        border: 'transparent',
      },
      _disabled: {
        opacity: 'disabled',
      },
    },
    label: {
      ...INPUT_RECIPE.base.label,
      paddingLeft: '50',
      _disabled: {
        opacity: 'disabled',
      },
    },
  },
});

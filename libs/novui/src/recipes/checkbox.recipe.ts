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
          cursor: 'pointer !important',
        },
      },
    },
    icon: {
      color: 'button.icon.filled !important',
    },
    input: {
      border: 'solid',
      borderColor: 'input.border !important',
      borderRadius: '50 !important',
      background: 'transparent !important',

      _checked: {
        ...colorPaletteGradientHorizontal,
        color: 'typography.text.main',
        border: 'transparent !important',
      },
      _disabled: {
        opacity: 'disabled',
      },
    },
    label: {
      ...INPUT_RECIPE.base.label,
      paddingLeft: '50 !important',
      _disabled: {
        opacity: 'disabled',
      },
    },
  },
});

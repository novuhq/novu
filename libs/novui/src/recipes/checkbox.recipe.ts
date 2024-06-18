import { CheckboxStylesNames } from '@mantine/core';
import { defineSlotRecipe } from '@pandacss/dev';
import { token } from 'styled-system/tokens';
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
      },
    },
    icon: {
      color: 'button.icon.filled !important',
    },
    input: {
      // backgroundColor: 'transparent',
      border: 'solid',
      borderRadius: '50 !important',

      _checked: {
        bg: token('gradients.horizontal'),
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

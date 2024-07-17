import { SelectStylesNames } from '@mantine/core';
import { defineSlotRecipe } from '@pandacss/dev';
import { INPUT_RECIPE } from './input.recipe';

// full enumeration of the component library's slots
const SLOTS: SelectStylesNames[] = [
  'root',
  'input',
  'wrapper',
  'section',
  'description',
  'error',
  'required',
  'label',
  'dropdown',
  'empty',
  'group',
  'groupLabel',
  'option',
  'options',
];

export const SELECT_RECIPE = defineSlotRecipe({
  className: 'select',
  jsx: ['Select'],
  slots: SLOTS,
  base: {
    ...INPUT_RECIPE.base,
    dropdown: {
      bg: 'surface.popover',
      borderRadius: 'input',
      padding: '25',
      marginY: '25',
      border: 'none',
      boxShadow: 'medium',
      color: 'typography.text.main',
    },
    option: {
      padding: '50',
      marginY: '25',
      borderRadius: '50',
      color: 'typography.text.main',
      _hover: {
        bg: 'select.option.surface.hover',
      },
      _selected: {
        fontWeight: 'strong',
        bg: 'select.option.surface.selected',
      },
    },
  },
});

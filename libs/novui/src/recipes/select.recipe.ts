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
      bg: 'surface.popover !important',
      borderRadius: 'input !important',
      padding: '25',
      marginY: '25',
      border: 'none !important',
      boxShadow: 'medium !important',
      color: 'typography.text.main',
    },
    option: {
      padding: '50 !important',
      marginY: '25',
      borderRadius: '50 !important',
      color: 'typography.text.main',
      _hover: {
        bg: 'select.option.surface.hover !important',
      },
      _selected: {
        fontWeight: 'strong',
        bg: 'select.option.surface.selected !important',
      },
    },
  },
});

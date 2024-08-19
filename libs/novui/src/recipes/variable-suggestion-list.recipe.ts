import { ComboboxStylesNames } from '@mantine/core';
import { defineSlotRecipe } from '@pandacss/dev';
import { SELECT_RECIPE } from './select.recipe';

// full enumeration of the component library's slots
const SLOTS: ComboboxStylesNames[] = ['option', 'options', 'dropdown'];

export const VARIABLE_SUGGESTION_LIST_RECIPE = defineSlotRecipe({
  className: 'variableSuggestionList',
  jsx: ['VariableSuggestionList'],
  slots: SLOTS,
  base: {
    dropdown: {
      ...SELECT_RECIPE.base.dropdown,
      maxHeight: 'components.menu.height',
      width: 'components.menu.width !important',
      overflowY: 'auto',
    },

    option: {
      padding: '50',
      marginY: '25',
      borderRadius: '50',
      color: 'typography.text.main',
      overflowX: '[hidden] !important',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',

      _hover: {
        bg: 'select.option.surface.hover',
      },
      _selected: {
        bg: 'select.option.surface.hover',
      },
    },
  },
  staticCss: ['*'],
});

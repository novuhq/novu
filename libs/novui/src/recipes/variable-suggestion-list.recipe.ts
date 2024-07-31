import { MenuStylesNames } from '@mantine/core';
import { defineSlotRecipe } from '@pandacss/dev';
import { SELECT_RECIPE } from './select.recipe';

// full enumeration of the component library's slots
const SLOTS: MenuStylesNames[] = ['item', 'itemLabel', 'itemSection', 'label', 'divider', 'dropdown', 'arrow'];

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
    item: {
      ...SELECT_RECIPE.base.option,
    },
    itemLabel: {
      overflowX: 'hidden !important',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  },
  staticCss: ['*'],
});

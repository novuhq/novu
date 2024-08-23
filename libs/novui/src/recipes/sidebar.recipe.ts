import { defineSlotRecipe } from '@pandacss/dev';

export const SIDEBAR_RECIPE = defineSlotRecipe({
  className: 'sidebar',
  jsx: ['Sidebar'],
  slots: ['sidebar'],
  base: {
    sidebar: {
      padding: 150,
      backgroundColor: 'sidebar.background',
      borderRadius: 150,
      position: 'absolute',
      right: 50,
      bottom: 50,
      width: '34%',
    },
  },
});

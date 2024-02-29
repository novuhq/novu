import { defineRecipe } from '@pandacss/dev';

export const TEXT_RECIPE = defineRecipe({
  className: 'text',
  jsx: ['Title', 'Text'],
  variants: {
    variant: {
      title: {
        textStyle: 'title/page',
      },
      text: {
        textStyle: 'text',
      },
    },
  },
});

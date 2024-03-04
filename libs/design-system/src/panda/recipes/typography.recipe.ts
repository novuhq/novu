import { defineRecipe } from '@pandacss/dev';

export const textRecipe = defineRecipe({
  className: 'text',
  description: 'Styles for text including: body and labels',
  jsx: ['Text'],
  variants: {
    variant: {
      // TODO: these textStyle mappings don't seem to work
      'text.main': { textStyle: 'text.main' },
      'text.secondary': { textStyle: 'text.secondary' },
      'text.mono': { textStyle: 'text.mono' },
      'text.strong': { textStyle: 'text.strong' },
      'title.page': { textStyle: 'title.page' },
      'title.section': { textStyle: 'title.section' },
      'title.subsection': { textStyle: 'title.subsection' },
    },
  },
  defaultVariants: {
    variant: 'text.main',
  },
});

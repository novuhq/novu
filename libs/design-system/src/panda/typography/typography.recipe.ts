import { defineRecipe } from '@pandacss/dev';

export const textRecipe = defineRecipe({
  className: 'text',
  description: 'Styles for text including: body and labels',
  jsx: ['Text'],
  variants: {
    variant: {
      main: { textStyle: 'text.main' },
      secondary: { textStyle: 'text.secondary' },
      mono: { textStyle: 'text.mono' },
      strong: { textStyle: 'text.strong', fontWeight: 'bold' },
    },
  },
});

export const titleRecipe = defineRecipe({
  className: 'title',
  description: 'Styles for title / heading',
  jsx: ['Title'],
  variants: {
    variant: {
      page: { textStyle: 'title.page' },
      section: { textStyle: 'title.section' },
      subsection: { textStyle: 'title.subsection' },
    },
  },
});

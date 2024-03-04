import { defineRecipe } from '@pandacss/dev';

export const TITLE_RECIPE = defineRecipe({
  className: 'title',
  description: 'Styles for title including: body and labels',
  jsx: ['Title'],
  base: {
    color: 'typography.text.main',
  },
  variants: {
    variant: {
      page: { textStyle: 'title.page' },
      section: { textStyle: 'title.section' },
      subsection: { textStyle: 'title.subsection' },
    },
  },
  defaultVariants: {
    variant: 'page',
  },
});

import { defineRecipe } from '@pandacss/dev';

export const TEXT_RECIPE = defineRecipe({
  className: 'text',
  description: 'Styles for text including: body and labels',
  jsx: ['Text'],
  base: {
    color: 'typography.text.main',
  },
  variants: {
    variant: {
      main: { textStyle: 'text.main' },
      // color is not a permitted field in `textStyles`, so we do it in the recipe instead
      secondary: { textStyle: 'text.secondary', color: 'typography.text.secondary' },
      mono: { textStyle: 'text.mono' },
      strong: { textStyle: 'text.strong' },
    },
  },
  defaultVariants: {
    variant: 'main',
  },
});

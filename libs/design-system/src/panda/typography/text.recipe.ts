import { cva, RecipeVariantProps } from 'styled-system/css';

export const textRecipe = cva({
  base: {
    color: 'semantic.typography.text.main',
    fontSize: '100',
  },
  variants: {
    variant: {
      title: {
        page: {
          // textStyles: {},
        },
      },
      text: {
        textStyle: 'text/main',
      },
    },
  },
});

export type TextVariantProps = RecipeVariantProps<typeof textRecipe>;

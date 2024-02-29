import { defineRecipe } from '@pandacss/dev';
import { RecipeVariantProps } from '@pandacss/types';

import { useMemo } from 'react';
import { styled, type HTMLStyledProps, type StyledComponent } from 'styled-system/jsx';
// import { text, type TextVariantProps } from 'styled-system/recipes';

type As = 'p' | 'span' | 'div' | 'label' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export type TextProps = {
  as?: As;
} & HTMLStyledProps<As>; // & TextVariantProps

export const Text = (props: TextProps) => {
  const { as = 'p', ...localProps } = props;
  // const Dynamic = useMemo(() => styled(as, TEXT_RECIPE) as StyledComponent<As>, [as]);

  return <p />;
};

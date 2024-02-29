import { cva } from 'styled-system/css';
import { Text, type TextProps } from './Text';

const button = cva({
  base: {
    display: 'flex',
  },
  variants: {
    visual: {
      solid: { bg: 'red.200', color: 'white' },
      outline: { borderWidth: '1px', borderColor: 'r' },
    },
    size: {
      sm: { padding: '4', fontSize: '12px' },
      lg: { padding: '8', fontSize: '24px' },
    },
  },
});

import { forwardRef } from 'react';

export type TitleProps = Omit<TextProps, 'variant'> & {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
};

export const Title = forwardRef<HTMLTitleElement, TitleProps>((props, ref) => {
  const { as = 'h2', ...textProps } = props;

  return (
    <Text
      ref={ref}
      as={as}
      // variant="title"
      {...textProps}
    />
  );
});

Title.displayName = 'Title';

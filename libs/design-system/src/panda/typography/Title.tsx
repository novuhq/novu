import { forwardRef } from 'react';
import { Text, TitleAs, type TextProps } from './Text';

export type TitleProps = Omit<TextProps, 'variant'> & {
  as?: TitleAs;
  variant?: Extract<TextProps['variant'], 'title.page' | 'title.section' | 'title.subsection'>;
};

/**
 * Special version of the `Text` component but specifically for heading displays.
 *
 * @default title.page
 */
export const Title = forwardRef<HTMLHeadingElement, TitleProps>((props, ref) => {
  const { variant = 'title.page', ...textProps } = props;

  return <Text ref={ref} variant={variant} {...textProps} />;
});

Title.displayName = 'Title';

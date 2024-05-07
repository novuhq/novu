import React from 'react';
import { Text as MantineText, MantineColor, useMantineTheme, TextProps } from '@mantine/core';

import { colors } from '../../config';
import { SpacingProps } from '../../shared/spacing.props';

interface ITextProps extends JSX.ElementChildrenAttribute, SpacingProps {
  size?: TextProps['size'];
  style?: TextProps['style'];
  styles?: TextProps['styles'];
  align?: 'left' | 'center' | 'right' | 'justify';
  weight?: 'bold' | 'normal';
  color?: MantineColor;
  rows?: number;
  gradient?: boolean;
  transform?: TextProps['transform'];
}

/**
 * Text component
 *
 */
export const Text = React.forwardRef<HTMLDivElement, ITextProps>(({ children, gradient = false, ...props }, ref) => {
  const { colorScheme } = useMantineTheme();
  const gradientStyles = gradient
    ? { backgroundImage: colors.horizontal, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
    : {};

  let textColor = props.color;
  if (!textColor) {
    textColor = colorScheme === 'dark' ? colors.white : colors.B40;
  }

  return (
    <MantineText
      lineClamp={props.rows}
      size="md"
      weight="normal"
      style={gradientStyles}
      ref={ref}
      {...props}
      color={textColor}
    >
      {children}
    </MantineText>
  );
});

import { Text as MantineText, MantineColor, useMantineTheme } from '@mantine/core';

import { colors } from '../../config';
import { SpacingProps } from '../../shared/spacing.props';

interface ITextProps extends JSX.ElementChildrenAttribute, SpacingProps {
  size?: 'md' | 'lg';
  align?: 'left' | 'center' | 'right' | 'justify';
  weight?: 'bold' | 'normal';
  color?: MantineColor;
  rows?: number;
  gradient?: boolean;
}

/**
 * Text component
 *
 */
export function Text({ children, gradient = false, ...props }: ITextProps) {
  const { colorScheme } = useMantineTheme();
  const gradientStyles = gradient
    ? { backgroundImage: colors.horizontal, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
    : {};

  let textColor = props.color;
  if (!textColor) {
    textColor = colorScheme === 'dark' ? colors.white : colors.B40;
  }

  return (
    <MantineText lineClamp={props.rows} size="md" weight="normal" style={gradientStyles} {...props} color={textColor}>
      {children}
    </MantineText>
  );
}

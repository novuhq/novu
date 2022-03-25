import { Text as MantineText, SharedTextProps, MantineColor, useMantineTheme, MantineMargins } from '@mantine/core';
import { colors } from '../../config';

interface ITextProps extends JSX.ElementChildrenAttribute, MantineMargins {
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
  const defaultDesign = { size: 'md', weight: 'normal' } as SharedTextProps;
  const gradientStyles = gradient
    ? { backgroundImage: colors.horizontal, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
    : {};

  let textColor = props.color;
  if (!textColor) {
    textColor = colorScheme === 'dark' ? colors.white : colors.B40;
  }

  return (
    <MantineText lineClamp={props.rows} {...defaultDesign} style={gradientStyles} {...props} color={textColor}>
      {children}
    </MantineText>
  );
}

import { Text as MantineText, SharedTextProps, MantineColor, useMantineTheme, MantineMargins } from '@mantine/core';
import { colors } from '../../config';

interface ITextProps extends JSX.ElementChildrenAttribute, MantineMargins {
  size?: 'md' | 'lg';
  align?: 'left' | 'center' | 'right' | 'justify';
  weight?: 'bold' | 'normal';
  color?: MantineColor;
  rows?: number;
}

/**
 * Text component
 *
 */
export function Text({ children, ...props }: ITextProps) {
  const { colorScheme } = useMantineTheme();
  const defaultDesign = { size: 'md', weight: 'normal' } as SharedTextProps;

  let textColor = props.color;
  if (!textColor) {
    textColor = colorScheme === 'dark' ? colors.white : colors.B40;
  }

  return (
    <MantineText lineClamp={props.rows} {...defaultDesign} {...props} color={textColor}>
      {children}
    </MantineText>
  );
}

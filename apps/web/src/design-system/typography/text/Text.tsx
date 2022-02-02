import { Text as MantineText } from '@mantine/core';

interface ITextProps extends JSX.ElementChildrenAttribute {
  size?: 'md' | 'lg';
  align?: 'left' | 'center' | 'right' | 'justify';
  weight?: 'bold' | 'normal';
}

/**
 * Text component
 * */
export function Text({ children, size = 'md', weight = 'normal', ...props }: ITextProps) {
  return (
    <MantineText size={size} weight={weight} {...props}>
      {children}
    </MantineText>
  );
}

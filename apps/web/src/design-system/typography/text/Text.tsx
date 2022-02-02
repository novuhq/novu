import { Text as MantineText } from '@mantine/core';

interface ITextProps extends JSX.ElementChildrenAttribute {
  /** Size of text. Medium or Large */
  size?: 'md' | 'lg';
  align?: 'left' | 'center' | 'right' | 'justify';
  weight?: 'bold' | 'normal' | 'bolder';
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

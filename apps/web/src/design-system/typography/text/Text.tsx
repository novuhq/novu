import { Text as MantineText, SharedTextProps, MantineColor } from '@mantine/core';

interface ITextProps extends JSX.ElementChildrenAttribute {
  size?: 'md' | 'lg';
  align?: 'left' | 'center' | 'right' | 'justify';
  weight?: 'bold' | 'normal';
  color?: MantineColor;
}

/**
 * Text component
 *
 */
export function Text({ children, ...props }: ITextProps) {
  const defaultDesign = { size: 'md', weight: 'normal' } as SharedTextProps;

  return (
    <MantineText {...defaultDesign} {...props}>
      {children}
    </MantineText>
  );
}

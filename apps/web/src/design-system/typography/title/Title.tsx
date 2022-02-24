import { Title as MantineTitle } from '@mantine/core';
import { colors } from '../../config';

interface ITitleProps extends JSX.ElementChildrenAttribute {
  size?: 1 | 2;
}
/**
 * Use Title to create headers.
 *
 */
export function Title({ size = 1, children }: ITitleProps) {
  return (
    <MantineTitle
      sx={(theme) => ({ fontWeight: '800', color: theme.colorScheme === 'dark' ? colors.white : colors.B40 })}
      order={size}>
      {children}
    </MantineTitle>
  );
}

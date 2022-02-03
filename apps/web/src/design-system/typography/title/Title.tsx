import { Title as MantineTitle } from '@mantine/core';

interface ITitleProps extends JSX.ElementChildrenAttribute {
  size?: 1 | 2;
}
/**
 * Use Title to create headers.
 *
 */
export function Title({ size = 1, children }: ITitleProps) {
  return (
    <MantineTitle sx={{ fontWeight: 'bolder' }} order={size}>
      {children}
    </MantineTitle>
  );
}

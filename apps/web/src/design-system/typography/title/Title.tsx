import { TitleOrder, Title as MantineTitle } from '@mantine/core';

interface ITitleProps extends JSX.ElementChildrenAttribute {
  order?: TitleOrder;
}
/**
 * Use Title to create headers.
 * */
export function Title({ order = 1, children }: ITitleProps) {
  return (
    <MantineTitle sx={{ fontWeight: 'bolder' }} order={order}>
      {children}
    </MantineTitle>
  );
}

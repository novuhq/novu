import { Button as MantineButton } from '@mantine/core';

interface IButtonProps extends JSX.ElementChildrenAttribute {
  loading: boolean;
  type?: 'primary';
}

export function Button({ loading, children, type = 'primary' }: IButtonProps) {
  return <MantineButton loading={loading}>{children}</MantineButton>;
}

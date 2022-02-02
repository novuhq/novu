import React from 'react';
import { Button as MantineButton } from '@mantine/core';
import useStyles from './Button.styles';

interface IButtonProps extends JSX.ElementChildrenAttribute {
  loading?: boolean;
  size?: 'md' | 'lg';
  variant?: 'outline' | 'filled';
  disabled?: boolean;
}

/**
 * Button component
 * */
export function Button({ loading, children, size = 'md', disabled = false, ...props }: IButtonProps) {
  const { classes } = useStyles(disabled);
  return (
    <MantineButton classNames={classes} disabled={disabled} radius="md" size={size} loading={loading} {...props}>
      {children}
    </MantineButton>
  );
}

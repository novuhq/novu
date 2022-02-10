import React from 'react';
import { Button as MantineButton, SharedButtonProps } from '@mantine/core';
import useStyles from './Button.styles';

interface IButtonProps extends JSX.ElementChildrenAttribute {
  loading?: boolean;
  size?: 'md' | 'lg';
  variant?: 'outline' | 'filled';
  disabled?: boolean;
}

/**
 * Button component
 *
 */
export function Button({ loading, children, size = 'md', disabled = false, ...props }: IButtonProps) {
  const { classes } = useStyles(disabled);
  const defaultDesign = { radius: 'md', classNames: classes } as SharedButtonProps;
  return (
    <MantineButton {...defaultDesign} disabled={disabled} size={size} loading={loading} {...props}>
      {children}
    </MantineButton>
  );
}

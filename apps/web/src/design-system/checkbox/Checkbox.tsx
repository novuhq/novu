import React from 'react';
import { Checkbox as MantineCheckbox } from '@mantine/core';
import useStyles from './Checkbox.styles';

interface CheckboxProps extends JSX.ElementChildrenAttribute {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  indeterminate?: boolean;
}

/**
 * Checkbox Component
 *
 */
export function Checkbox({ children, size = 'md', disabled = false, indeterminate = false, ...props }: CheckboxProps) {
  const { classes } = useStyles();
  return (
    <MantineCheckbox
      classNames={classes}
      disabled={disabled}
      size={size}
      label={children}
      indeterminate={indeterminate}
      {...props}
    />
  );
}

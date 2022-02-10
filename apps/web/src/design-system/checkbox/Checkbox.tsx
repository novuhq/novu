import React from 'react';
import { Checkbox as MantineCheckbox } from '@mantine/core';
import useStyles from './Checkbox.styles';

interface CheckboxProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  checked?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  label?: string;
}

/**
 * Checkbox Component
 *
 */
export function Checkbox({
  label = 'Default Checkbox',
  size = 'md',
  checked,
  disabled = false,
  indeterminate = false,
  ...props
}: CheckboxProps) {
  const { classes } = useStyles();
  return (
    <MantineCheckbox
      classNames={classes}
      label={label}
      disabled={disabled}
      size={size}
      checked={checked}
      indeterminate={indeterminate}
      {...props}
    />
  );
}

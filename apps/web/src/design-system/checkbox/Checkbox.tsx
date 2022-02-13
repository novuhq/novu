import React from 'react';
import { Checkbox as MantineCheckbox } from '@mantine/core';
import useStyles from './Checkbox.styles';

interface CheckboxProps {
  checked?: boolean;
  disabled?: boolean;
  label?: string;
}

/**
 * Checkbox Component
 *
 */
export function Checkbox({ label = 'Default Checkbox', checked, disabled = false, ...props }: CheckboxProps) {
  const { classes } = useStyles();
  return (
    <MantineCheckbox classNames={classes} label={label} disabled={disabled} size="sm" checked={checked} {...props} />
  );
}

import React, { ChangeEvent } from 'react';
import { Radio as MantineRadio } from '@mantine/core';
import useStyles from './Radio.styles';

export interface RadioProps extends JSX.ElementChildrenAttribute {
  value: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Checkbox Component
 *
 */
export function Radio({ value, onChange, disabled = false, checked, children, ...props }: RadioProps) {
  const { classes } = useStyles();

  return (
    <MantineRadio
      value={value}
      onChange={onChange}
      checked={checked}
      classNames={classes}
      disabled={disabled}
      size="md"
      {...props}
    >
      {children}
    </MantineRadio>
  );
}

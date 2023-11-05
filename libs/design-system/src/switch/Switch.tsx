import React, { ChangeEvent } from 'react';
import { Switch as MantineSwitch } from '@mantine/core';
import useStyles from './Switch.styles';

interface ISwitchProps {
  label?: React.ReactNode;
  checked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Switch component
 *
 */
export const Switch = React.forwardRef<HTMLInputElement, ISwitchProps>(
  ({ onChange, loading = false, disabled = false, ...props }, ref) => {
    const { classes } = useStyles();

    return (
      <MantineSwitch
        ref={ref}
        disabled={disabled}
        onChange={onChange}
        radius="xl"
        size="md"
        classNames={classes}
        {...props}
      />
    );
  }
);

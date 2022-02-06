import React, { useState } from 'react';
import { Switch as MantineSwitch, SwitchProps } from '@mantine/core';
import useStyles from './Switch.styles';

interface ISwitchProps {
  label?: React.ReactNode;
  checked?: boolean;
}

/**
 * Switch component
 *
 */
export function Switch({ ...props }: ISwitchProps) {
  const { classes } = useStyles();
  const defaultDesign = { radius: 'xl', size: 'md' } as SwitchProps;
  const [checked, setChecked] = useState(false);
  return (
    <MantineSwitch
      classNames={classes}
      {...defaultDesign}
      checked={checked}
      onChange={(event) => setChecked(event.currentTarget.checked)}
      {...props}
    />
  );
}

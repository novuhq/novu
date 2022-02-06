import React, { useState } from 'react';
import { Switch as MantineSwitch, SwitchProps } from '@mantine/core';
import useStyles from './Switch.styles';

/**
 * ask
 * disabled? or just switched?
 * allow one size?
 * no shadow?
 * add disabled option?
 * allow any label?
 * is it a good idea to separate our defaults for mantine components?
 * what about default state? checked? add option to component?
 * disabled meaning unchecked, yes?
 * sizesvand padding
 *
 * assumes same label- changes by checked
 * *
 */

interface ISwitchProps extends JSX.ElementChildrenAttribute {
  label?: React.ReactNode;
  checked?: boolean;
}

/**
 * Switch component
 *
 */
export function Switch({ label, ...props }: ISwitchProps) {
  const { classes } = useStyles();
  const defaultDesign = { radius: 'xl', size: 'md' } as SwitchProps;
  const [checked, setChecked] = useState(false);
  return (
    <MantineSwitch
      classNames={classes}
      {...defaultDesign}
      label={label}
      checked={checked}
      onChange={(event) => setChecked(event.currentTarget.checked)}
      {...props}
    />
  );
}

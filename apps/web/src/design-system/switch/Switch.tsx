import React from 'react';
import { Switch as MantineSwitch, SwitchProps } from '@mantine/core';
import useStyles from './Switch.styles';

interface ISwitchProps {
  label?: React.ReactNode;
}

/**
 * Switch component
 *
 */
export function Switch({ ...props }: ISwitchProps) {
  const { classes } = useStyles();
  const defaultDesign = { radius: 'xl', size: 'md', classNames: classes } as SwitchProps;

  return <MantineSwitch {...defaultDesign} {...props} />;
}

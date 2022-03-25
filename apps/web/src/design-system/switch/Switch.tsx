import React, { ChangeEvent } from 'react';
import { Switch as MantineSwitch, SwitchProps } from '@mantine/core';
import useStyles from './Switch.styles';

interface ISwitchProps {
  label?: React.ReactNode;
  checked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  loading?: boolean;
}

/**
 * Switch component
 *
 */
export const Switch = React.forwardRef<HTMLInputElement, ISwitchProps>(
  ({ onChange, loading = false, ...props }, ref) => {
    const { classes } = useStyles();
    const defaultDesign = { radius: 'xl', size: 'md', classNames: classes } as SwitchProps;

    return <MantineSwitch ref={ref} onChange={onChange} {...defaultDesign} {...props} />;
  }
);

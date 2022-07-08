import React from 'react';
import { Tooltip as MantineTooltip, TooltipProps } from '@mantine/core';
import useStyles from './Tooltip.styles';

interface ITooltipProps extends JSX.ElementChildrenAttribute {
  label: React.ReactNode;
  opened?: boolean;
}

/**
 * Tooltip component
 *
 */
export function Tooltip({ children, label, opened = undefined, ...props }: ITooltipProps) {
  const { classes } = useStyles();
  const defaultDesign = {
    withArrow: true,
    arrowSize: 3.5,
    radius: 'md',
    wrapLines: true,
  } as TooltipProps;

  return (
    <MantineTooltip opened={opened} classNames={classes} {...defaultDesign} label={label} {...props}>
      {children}
    </MantineTooltip>
  );
}

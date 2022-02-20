import React from 'react';
import { Tooltip as MantineTooltip, TooltipProps } from '@mantine/core';
import useStyles from './Tooltip.styles';

interface ITooltipProps extends JSX.ElementChildrenAttribute {
  label: React.ReactNode;
}

/**
 * Tooltip component
 *
 */
export function Tooltip({ children, ...props }: ITooltipProps) {
  const { classes } = useStyles();
  const defaultDesign = {
    withArrow: true,
    arrowSize: 3.5,
    radius: 'md',
    wrapLines: true,
  } as TooltipProps;

  return (
    <MantineTooltip classNames={classes} {...defaultDesign} {...props}>
      {children}
    </MantineTooltip>
  );
}

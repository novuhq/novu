import { Tooltip as MantineTooltip, TooltipProps } from '@mantine/core';

import useStyles from './Tooltip.styles';

/**
 * Tooltip component
 *
 */
export function Tooltip({
  children,
  label,
  opened = undefined,
  ...props
}: Pick<
  TooltipProps,
  | 'multiline'
  | 'width'
  | 'label'
  | 'opened'
  | 'position'
  | 'disabled'
  | 'children'
  | 'sx'
  | 'withinPortal'
  | 'offset'
  | 'classNames'
>) {
  const { classes } = useStyles();

  return (
    <MantineTooltip
      transition="fade"
      transitionDuration={300}
      opened={opened}
      classNames={classes}
      withArrow
      arrowSize={3.5}
      radius="md"
      label={label}
      {...props}
    >
      {children}
    </MantineTooltip>
  );
}

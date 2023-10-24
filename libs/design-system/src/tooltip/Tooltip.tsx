import { Tooltip as MantineTooltip, TooltipProps } from '@mantine/core';

import useStyles from './Tooltip.styles';

interface ITooltipProps
  extends Pick<
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
  > {
  error?: boolean;
}
/**
 * Tooltip component
 *
 */
export function Tooltip({ children, label, opened = undefined, error = false, ...props }: ITooltipProps) {
  const { classes } = useStyles({ error });

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

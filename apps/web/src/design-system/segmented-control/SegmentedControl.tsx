import React from 'react';
import {
  SegmentedControl as MantineSegmentedControl,
  SegmentedControlProps,
  SegmentedControlItem,
} from '@mantine/core';
import useStyles from './SegmentedControl.styles';

interface ISegmentedControlProps {
  data: string[] | SegmentedControlItem[];
  defaultValue?: string;
  onChange?(value: string): void;
  loading?: boolean;
}

/**
 * SegmentedControl component
 *
 */
export const SegmentedControl = React.forwardRef<HTMLDivElement, ISegmentedControlProps>(
  ({ onChange, loading = false, ...props }, ref) => {
    const { classes } = useStyles();
    const defaultDesign = {
      radius: 'xl',
      size: 'md',
      transitionDuration: 500,
      transitionTimingFunction: 'linear',
      classNames: classes,
    } as SegmentedControlProps;

    return <MantineSegmentedControl ref={ref} onChange={onChange} {...defaultDesign} {...props} />;
  }
);

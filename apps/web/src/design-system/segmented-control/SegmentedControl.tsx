import React from 'react';
import {
  SegmentedControl as MantineSegmentedControl,
  SegmentedControlProps,
  SegmentedControlItem,
  LoadingOverlay,
} from '@mantine/core';
import useStyles from './SegmentedControl.styles';
import { colors } from '../config';

interface ISegmentedControlProps {
  data: string[] | SegmentedControlItem[];
  defaultValue?: string;
  value?: string;
  onChange?(value: string): void;
  loading?: boolean;
}

/**
 * SegmentedControl component
 *
 */
export const SegmentedControl = React.forwardRef<HTMLDivElement, ISegmentedControlProps>(
  ({ onChange, loading = false, ...props }, ref) => {
    const { classes, theme } = useStyles();
    const defaultDesign = {
      radius: 'xl',
      size: 'md',
      transitionDuration: 500,
      transitionTimingFunction: 'linear',
      classNames: classes,
    } as SegmentedControlProps;

    return (
      <div style={{ position: 'relative', marginBottom: 30 }}>
        <LoadingOverlay
          visible={loading}
          overlayColor={theme.colorScheme === 'dark' ? colors.B30 : colors.B98}
          loaderProps={{
            color: colors.error,
          }}
        />
        <MantineSegmentedControl ref={ref} onChange={onChange} {...defaultDesign} {...props} />{' '}
      </div>
    );
  }
);

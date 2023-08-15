import React from 'react';
import {
  SegmentedControl as MantineSegmentedControl,
  SegmentedControlProps,
  SegmentedControlItem,
  LoadingOverlay,
  Sx,
} from '@mantine/core';
import useStyles from './SegmentedControl.styles';
import { colors } from '../config';
import styled from '@emotion/styled';

interface ISegmentedControlProps {
  data: string[] | SegmentedControlItem[];
  defaultValue?: string;
  value?: string;
  onChange?(value: string): void;
  loading?: boolean;
  fullWidth?: boolean;
  sx?: Sx | (Sx | undefined)[];
  disabled?: boolean;
  size?: 'md' | 'sm';
}

/**
 * SegmentedControl component
 *
 */
export const SegmentedControl = React.forwardRef<HTMLDivElement, ISegmentedControlProps>(
  ({ onChange, loading = false, ...props }, ref) => {
    const { classes, theme } = useStyles({
      size: props.size || 'md',
    });
    const defaultDesign = {
      radius: 'xl',
      size: 'md',
      transitionDuration: 500,
      transitionTimingFunction: 'linear',
      classNames: classes,
    } as SegmentedControlProps;

    return (
      <ControlWrapper style={{ position: 'relative', marginBottom: 0 }}>
        <LoadingOverlay
          visible={loading}
          overlayColor={theme.colorScheme === 'dark' ? colors.B30 : colors.B98}
          loaderProps={{
            color: colors.error,
          }}
          data-test-id={props['data-test-id'] + '-loading-overlay'}
        />
        <MantineSegmentedControl ref={ref} onChange={onChange} {...defaultDesign} {...props} />
      </ControlWrapper>
    );
  }
);

const ControlWrapper = styled.div`
  position: relative;
  margin-bottom: 30px;

  .mantine-SegmentedControl-control {
    border-color: transparent;
  }
`;

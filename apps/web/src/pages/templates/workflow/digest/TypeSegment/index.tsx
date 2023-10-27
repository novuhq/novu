import React from 'react';
import {
  SegmentedControl as MantineSegmentedControl,
  SegmentedControlProps,
  SegmentedControlItem,
  Sx,
} from '@mantine/core';
import useStyles from './TypeSegment.styles';
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
 * TypeSegmented component
 *
 */
export const TypeSegmented = React.forwardRef<HTMLDivElement, ISegmentedControlProps>(
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
      <ControlWrapper style={{ position: 'relative', marginBottom: 30 }}>
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

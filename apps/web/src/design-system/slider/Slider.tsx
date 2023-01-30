import React from 'react';
import { Slider as MantineSlider } from '@mantine/core';
import useStyles from './Slider.styles';
import { SpacingProps } from '../shared/spacing.props';

interface IRangeSliderProps extends SpacingProps {
  value?: number;
  disabled?: boolean;
  labelAlwaysOn?: boolean;
  thumbSize?: number;
  max?: number;
  onChange?: (event: number) => void;
}

export const Slider = React.forwardRef<HTMLInputElement, IRangeSliderProps>(
  ({ onChange, max = 100, labelAlwaysOn = false, disabled = false, ...props }: IRangeSliderProps, ref) => {
    const { classes } = useStyles({ disabled });

    return (
      <MantineSlider
        max={max}
        classNames={classes}
        onChange={onChange}
        disabled={disabled}
        labelAlwaysOn={labelAlwaysOn}
        {...props}
      />
    );
  }
);

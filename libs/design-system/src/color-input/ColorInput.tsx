import React from 'react';
import { ColorInput as MantineColorInput, ColorInputProps } from '@mantine/core';
import { inputStyles } from '../config/inputs.styles';
import { SpacingProps } from '../shared/spacing.props';

const defaultSwatchColors: string[] = [
  '#f47373',
  '#D9E3F0',
  '#697689',
  '#37D67A',
  '#2CCCE4',
  '#DCE775',
  '#FF8A65',
  '#BA68C8',
  '#555555',
];

interface IColorInputProps extends SpacingProps {
  label?: React.ReactNode;
  error?: string;
  placeholder?: string;
  value?: string;
  description?: string;
  disallowInput?: boolean;
  onChange?: (color: string) => void;
}

/**
 * ColorPicker component
 *
 */
export const ColorInput = React.forwardRef<HTMLInputElement, IColorInputProps>(
  ({ value, onChange, ...props }: IColorInputProps, ref) => {
    const defaultDesign = { radius: 'md', size: 'md', disallowInput: true, styles: inputStyles } as ColorInputProps;

    return (
      <MantineColorInput
        ref={ref}
        swatches={defaultSwatchColors}
        {...defaultDesign}
        onChange={onChange}
        value={value}
        {...props}
      />
    );
  }
);

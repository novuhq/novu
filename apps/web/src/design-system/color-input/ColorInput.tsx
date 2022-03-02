import React from 'react';
import { ColorInput as MantineColorInput, ColorInputProps, MantineMargins } from '@mantine/core';
import { inputStyles } from '../config/inputs.styles';

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

interface IColorInputProps extends MantineMargins {
  label?: React.ReactNode;
  error?: string;
  placeholder?: string;
  value?: string;
  description?: string;
  onChange?: (color: string) => void;
}

/**
 * ColorPicker component
 *
 */
export function ColorInput({ value, onChange, ...props }: IColorInputProps) {
  const defaultDesign = { radius: 'md', size: 'md', disallowInput: true, styles: inputStyles } as ColorInputProps;

  return (
    <MantineColorInput swatches={defaultSwatchColors} {...defaultDesign} onChange={onChange} value={value} {...props} />
  );
}

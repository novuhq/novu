import React from 'react';
import { ColorInput as MantineColorInput, ColorInputProps } from '@mantine/core';
import { inputStyles } from '../config/inputs.styles';

interface IColorInputProps {
  label?: React.ReactNode;
  error?: string;
  placeholder?: string;
  value?: string;
  description?: string;
  onChange?: (color: string) => void;
}

/**
 * Input component
 *
 */
export function ColorPicker({ value, onChange, ...props }: IColorInputProps) {
  const defaultDesign = { radius: 'md', size: 'md', styles: inputStyles } as ColorInputProps;

  return <MantineColorInput {...defaultDesign} onChange={onChange} defaultValue={value} {...props} />;
}

import React from 'react';
import { TextInputProps, TextInput as MantineTextInput } from '@mantine/core';
import { inputStyles } from '../config/inputs.styles';

interface IInputProps {
  label?: React.ReactNode;
  error?: string;
  placeholder?: string;
  value?: string;
  description?: string;
}

/**
 * Input component
 *
 */
export function Input({ value, ...props }: IInputProps) {
  const defaultDesign = { radius: 'md', size: 'md', styles: inputStyles } as TextInputProps;
  return <MantineTextInput {...defaultDesign} defaultValue={value} {...props} />;
}

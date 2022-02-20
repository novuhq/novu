import React, { ChangeEvent } from 'react';
import { TextInputProps, TextInput as MantineTextInput } from '@mantine/core';
import { inputStyles } from '../config/inputs.styles';

interface IInputProps {
  label?: React.ReactNode;
  error?: string;
  placeholder?: string;
  value?: string;
  description?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  rightSection?: React.ReactNode;
}

/**
 * Input component
 *
 */
export function Input({ value, rightSection, onChange, ...props }: IInputProps) {
  const defaultDesign = { radius: 'md', size: 'md', styles: inputStyles } as TextInputProps;

  return (
    <MantineTextInput
      {...(rightSection ? { rightSection, rightSectionWidth: 50 } : {})}
      {...defaultDesign}
      onChange={onChange}
      defaultValue={value}
      {...props}
    />
  );
}

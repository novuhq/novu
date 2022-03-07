import React, { ChangeEvent } from 'react';
import { TextInputProps, TextInput as MantineTextInput, MantineMargins } from '@mantine/core';
import { inputStyles } from '../config/inputs.styles';

interface IInputProps extends MantineMargins {
  label?: React.ReactNode;
  error?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  value?: string;
  description?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  rightSection?: React.ReactNode;
}

/**
 * Input component
 *
 */
export const Input = React.forwardRef<HTMLInputElement, IInputProps>(
  ({ value, rightSection, onChange, readOnly = false, ...props }: IInputProps, ref) => {
    const defaultDesign = { radius: 'md', size: 'md', styles: inputStyles } as TextInputProps;

    return (
      <MantineTextInput
        ref={ref}
        {...(rightSection ? { rightSection, rightSectionWidth: 50 } : {})}
        {...defaultDesign}
        onChange={onChange}
        readOnly={readOnly}
        value={value}
        {...props}
      />
    );
  }
);

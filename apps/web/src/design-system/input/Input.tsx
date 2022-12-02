import React, { ChangeEvent, FocusEvent } from 'react';
import { TextInputProps, TextInput as MantineTextInput } from '@mantine/core';
import { inputStyles } from '../config/inputs.styles';
import { SpacingProps } from '../shared/spacing.props';

interface IInputProps extends SpacingProps {
  label?: React.ReactNode;
  error?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  value?: string;
  description?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  rightSection?: React.ReactNode;
  type?: 'text' | 'password' | 'email' | 'search' | 'tel' | 'url' | 'number';
  min?: string | number | undefined;
  max?: string | number | undefined;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
}

/**
 * Input component
 *
 */
export const Input = React.forwardRef<HTMLInputElement, IInputProps>(
  ({ value, rightSection, onChange, readOnly = false, disabled = false, type, ...props }: IInputProps, ref) => {
    const defaultDesign = { radius: 'md', size: 'md', styles: inputStyles, type: 'text' } as TextInputProps;

    return (
      <MantineTextInput
        ref={ref}
        {...(rightSection ? { rightSection, rightSectionWidth: 50 } : {})}
        {...defaultDesign}
        onChange={onChange}
        autoComplete="off"
        readOnly={readOnly}
        disabled={disabled}
        value={value}
        type={type}
        {...props}
      />
    );
  }
);

import React, { ChangeEvent } from 'react';
import { TextInputProps, TextInput as MantineTextInput } from '@mantine/core';
import { inputStyles } from '../config/inputs.styles';
import { SpacingProps } from '../shared/spacing.props';

interface IInputProps extends SpacingProps {
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
        autoComplete="off"
        readOnly={readOnly}
        value={value}
        {...props}
      />
    );
  }
);

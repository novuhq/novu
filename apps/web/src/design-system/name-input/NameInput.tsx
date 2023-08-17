import React, { ChangeEvent } from 'react';
import { TextInput as MantineTextInput } from '@mantine/core';
import { SpacingProps } from '../shared/spacing.props';
import { nameInputStyles } from './nameInputStyles';

interface INameInputProps extends SpacingProps {
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * NameInput component
 *
 */
export const NameInput = React.forwardRef<HTMLInputElement, INameInputProps>(
  ({ value, onChange, disabled = false, ...props }: INameInputProps, ref) => {
    return (
      <MantineTextInput
        ref={ref}
        styles={nameInputStyles}
        onChange={onChange}
        autoComplete="off"
        disabled={disabled}
        value={value}
        {...props}
      />
    );
  }
);

import React, { ChangeEvent, FocusEvent } from 'react';
import { TextInputProps, TextInput as MantineTextInput, Styles, InputProps } from '@mantine/core';
import { inputStyles } from '../config/inputs.styles';
import { SpacingProps } from '../shared/spacing.props';

export interface IInputProps extends SpacingProps, Pick<InputProps, 'classNames'> {
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
  rightSectionWidth?: React.CSSProperties['width'];
  type?: 'text' | 'password' | 'email' | 'search' | 'tel' | 'url' | 'number' | 'time';
  min?: string | number;
  max?: string | number;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  styles?: Styles<string, Record<string, any>>;
  className?: string;
  id?: string;
}

/**
 * Input component
 *
 */
export const Input = React.forwardRef<HTMLInputElement, IInputProps>(
  (
    {
      value,
      rightSection,
      rightSectionWidth,
      onChange,
      readOnly = false,
      disabled = false,
      type,
      ...props
    }: IInputProps,
    ref
  ) => {
    const defaultDesign = { radius: 'md', size: 'md', styles: inputStyles, type: 'text' } as TextInputProps;

    return (
      <MantineTextInput
        ref={ref}
        {...(rightSection ? { rightSection, rightSectionWidth: rightSectionWidth ?? 50 } : {})}
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

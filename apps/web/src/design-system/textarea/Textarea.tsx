import React, { ChangeEvent } from 'react';
import { Textarea as MantineTextarea } from '@mantine/core';
import { SpacingProps } from '../shared/spacing.props';
import { textareaStyles } from './textarea.styles';

interface ITextareaProps extends SpacingProps {
  label?: React.ReactNode;
  error?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  description?: string;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  minRows?: number;
  maxRows?: number;
}

/**
 * Textarea component
 *
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, ITextareaProps>(
  ({ value, onChange, disabled = false, ...props }: ITextareaProps, ref) => {
    return (
      <MantineTextarea
        ref={ref}
        styles={textareaStyles}
        onChange={onChange}
        autoComplete="off"
        disabled={disabled}
        value={value}
        {...props}
      />
    );
  }
);

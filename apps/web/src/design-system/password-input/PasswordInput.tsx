import React, { ChangeEvent } from 'react';
import styled from '@emotion/styled';
import { PasswordInputProps, PasswordInput as MantinePasswordInput, MantineMargins } from '@mantine/core';
import { colors } from '../config';
import { inputStyles } from '../config/inputs.styles';

interface IPasswordInputProps extends MantineMargins {
  label?: React.ReactNode;
  error?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  value?: string;
  description?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Password Input component
 *
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, IPasswordInputProps>(
  ({ value, onChange, ...props }: IPasswordInputProps, ref) => {
    const defaultDesign = { radius: 'md', size: 'md', styles: inputStyles } as PasswordInputProps;

    return (
      <StyledPassword ref={ref} {...defaultDesign} onChange={onChange} autoComplete="off" value={value} {...props} />
    );
  }
);

const StyledPassword = styled(MantinePasswordInput)<{ error?: any }>`
  button {
    color: ${colors.B40};
    margin-right: 10px;
  }

  input {
    height: 100%;
  }

  input::placeholder {
    color: ${colors.B40};
  }
`;

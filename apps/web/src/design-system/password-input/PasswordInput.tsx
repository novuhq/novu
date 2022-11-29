import React, { ChangeEvent } from 'react';
import styled from '@emotion/styled';
import { PasswordInputProps, PasswordInput as MantinePasswordInput } from '@mantine/core';
import { colors } from '../config';
import { inputStyles } from '../config/inputs.styles';
import { SpacingProps } from '../shared/spacing.props';

interface IPasswordInputProps extends SpacingProps {
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
      <StyledPassword
        ref={ref}
        {...defaultDesign}
        onChange={onChange}
        autoComplete="off"
        value={value}
        {...props}
        toggleTabIndex={0}
      />
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
`;

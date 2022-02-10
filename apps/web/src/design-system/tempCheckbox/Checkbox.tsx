import React from 'react';
import { Checkbox as MantineCheckbox } from '@mantine/core';

export interface ICheckboxProps {
  label?: React.ReactNode;
}

/**
 * Checkbox component
 *
 */
export function Checkbox({ ...props }: ICheckboxProps) {
  return (
    <MantineCheckbox
      styles={(theme) => ({
        root: { width: '100%' },
        input: {
          borderColor: theme.colors.gray[7],
          '&:checked': {
            backgroundImage: theme.colors.gradient[8],
          },
        },
      })}
      {...props}
    />
  );
}

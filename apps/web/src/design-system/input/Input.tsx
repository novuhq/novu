import React from 'react';
import { TextInputProps, TextInput as MantineTextInput } from '@mantine/core';
import useStyles from './Input.styles';

interface IInputProps {
  label?: React.ReactNode;
  error?: string;
  placeholder?: string;
  value?: string;
  description?: string;
}

/**
 * Input component
 *
 */
export function Input({ value, ...props }: IInputProps) {
  const { classes } = useStyles();
  const defaultDesign = { radius: 'md', size: 'md' } as TextInputProps;
  return <MantineTextInput defaultValue={value} classNames={classes} {...defaultDesign} {...props} />;
}

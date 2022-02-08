import React from 'react';
import { TextInputProps, TextInput as MantineTextInput } from '@mantine/core';
import useStyles from './TextInput.styles';

interface ITextInputProps {
  label?: React.ReactNode;
  error?: string;
  placeholder?: string;
  value?: string;
}

/**
 * Text Input component
 *
 */
export function TextInput({ ...props }: ITextInputProps) {
  const { classes } = useStyles();
  const defaultDesign = { radius: 'md', size: 'md' } as TextInputProps;
  return <MantineTextInput classNames={classes} {...defaultDesign} {...props} />;
}

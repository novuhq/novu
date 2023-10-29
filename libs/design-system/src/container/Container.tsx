import React from 'react';
import { Container as MantineContainer, ContainerProps } from '@mantine/core';
import { colors, shadows } from '../config';

/**
 * Container component
 *
 */
export function Container({ children, ...props }: ContainerProps) {
  return (
    <MantineContainer
      sx={(theme) => ({
        padding: '0px',
        borderRadius: '7px',
        boxShadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.light,
        backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
      })}
      {...props}
    >
      {children}
    </MantineContainer>
  );
}

import React from 'react';
import { Button as MantineButton, SharedButtonProps } from '@mantine/core';
import useStyles from './Button.styles';

interface IButtonProps extends JSX.ElementChildrenAttribute {
  loading?: boolean;
  size?: 'md' | 'lg';
  variant?: 'outline' | 'filled';
  disabled?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
}

/**
 * Button component
 *
 */
export function Button({ loading, children, icon, size = 'md', disabled = false, onClick, ...props }: IButtonProps) {
  const { classes } = useStyles(disabled);
  const defaultDesign = { radius: 'md', classNames: classes } as SharedButtonProps;
  const withIconProps = icon ? { leftIcon: icon } : {};

  return (
    <MantineButton
      {...defaultDesign}
      {...withIconProps}
      onClick={onClick}
      disabled={disabled}
      size={size}
      loading={loading}
      {...props}>
      {children}
    </MantineButton>
  );
}

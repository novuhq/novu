import React from 'react';
import { Menu, MenuProps, Sx } from '@mantine/core';
import useStyles from './Dropdown.styles';
import { shadows } from '../config';

interface IDropdownProps extends JSX.ElementChildrenAttribute {
  control?: React.ReactElement;
  opened?: boolean;
  gutter?: number;
  placement?: 'center' | 'end' | 'start';
  sx?: Sx | Sx[];
}
export function Dropdown({ children, ...props }: IDropdownProps) {
  const { classes, theme } = useStyles();
  const defaultDesign = {
    withArrow: true,
    transitionDuration: 0,
    radius: 7,
    gutter: 10,
    shadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.light,
    classNames: classes,
  } as MenuProps;

  return (
    <Menu {...defaultDesign} {...props}>
      {children}
    </Menu>
  );
}

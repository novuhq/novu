import React from 'react';
import { Menu, MenuProps } from '@mantine/core';

import useStyles from './Dropdown.styles';
import { shadows } from '../config';

interface IDropdownProps
  extends Pick<MenuProps, 'opened' | 'offset' | 'position' | 'onOpen' | 'onClose' | 'withinPortal'> {
  control: React.ReactNode;
  children: React.ReactNode;
}

export function Dropdown({ control, children, ...props }: IDropdownProps) {
  const { classes, theme } = useStyles();

  return (
    <Menu
      withArrow
      transitionDuration={0}
      radius={7}
      offset={10}
      shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.light}
      classNames={classes}
      clickOutsideEvents={['click', 'mousedown', 'touchstart']}
      {...props}
    >
      <Menu.Target>{control}</Menu.Target>
      <Menu.Dropdown>{children}</Menu.Dropdown>
    </Menu>
  );
}

Dropdown.Item = Menu.Item;
Dropdown.Label = Menu.Label;

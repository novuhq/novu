import { Tabs } from '@mantine/core';
import { ReactNode, useState } from 'react';

import useStyles from './tabs.styles';

interface IMenuButtonProp {
  label: string;
  content?: ReactNode | string;
  icon?: ReactNode | string;
}

interface ITabsProp extends JSX.ElementChildrenAttribute {
  menuTabs: IMenuButtonProp[];
  orientation?: 'horizontal' | 'vertical';
  position?: 'right' | 'center' | 'left' | 'apart';
  withIcon?: boolean;
}

export function Tab({ menuTabs, orientation = 'horizontal', withIcon = false, position = 'left' }: ITabsProp) {
  const { classes } = useStyles(withIcon);

  return (
    <Tabs orientation={orientation} position={position} variant="unstyled" classNames={classes}>
      {menuTabs.map((menuTab, i) =>
        withIcon ? (
          <Tabs.Tab label={menuTab.label} icon={menuTab.icon} key={i}>
            {menuTab.content}
          </Tabs.Tab>
        ) : (
          <Tabs.Tab label={menuTab.label} key={i}>
            {menuTab.content}
          </Tabs.Tab>
        )
      )}
    </Tabs>
  );
}

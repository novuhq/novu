import { Tabs } from '@mantine/core';
import { ReactNode, useState } from 'react';

import useStyles from './tabs.styles';

interface IMenuButtonProp {
  label: string;
  content?: ReactNode | string;
  icon?: ReactNode | string;
}

interface ITabsProp extends JSX.ElementChildrenAttribute {
  MenuTab: IMenuButtonProp[];
  orientation?: 'horizontal' | 'vertical';
  position?: 'right' | 'center' | 'left' | 'apart';
  withIcon?: boolean;
}

export function Tab({ MenuTab, orientation = 'horizontal', withIcon = false, position = 'left' }: ITabsProp) {
  const { classes } = useStyles(withIcon);

  const [activeTab, setActiveTab] = useState(1);

  return (
    <Tabs
      orientation={orientation}
      position={position}
      variant="unstyled"
      classNames={classes}
      active={activeTab}
      onTabChange={setActiveTab}>
      {MenuTab.map((menu, i) =>
        withIcon ? (
          <Tabs.Tab label={menu.label} icon={menu.icon} key={i}>
            {menu.content}
          </Tabs.Tab>
        ) : (
          <Tabs.Tab label={menu.label} key={i}>
            {menu.content}
          </Tabs.Tab>
        )
      )}
    </Tabs>
  );
}

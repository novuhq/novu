import { Tabs as MantineTabs } from '@mantine/core';
import { ReactNode } from 'react';
import useStyles from './Tabs.styles';

interface IMenuButtonProp {
  label: string;
  content?: ReactNode | string;
  icon?: ReactNode | string;
}

interface ITabsProp {
  menuTabs: IMenuButtonProp[];
  orientation?: 'horizontal' | 'vertical';
  active?: number;
  onTabChange?: (tabIndex: number, tabKey?: string) => void;
  position?: 'right' | 'center' | 'left' | 'apart';
  withIcon?: boolean;
}

export function Tabs({
  menuTabs,
  active,
  onTabChange,
  orientation = 'horizontal',
  withIcon = false,
  position = 'left',
}: ITabsProp) {
  const { classes } = useStyles(withIcon);

  return (
    <MantineTabs
      orientation={orientation}
      active={active}
      onTabChange={onTabChange}
      position={position}
      variant="unstyled"
      classNames={classes}>
      {menuTabs.map((menuTab, i) =>
        withIcon ? (
          <MantineTabs.Tab label={menuTab.label} icon={menuTab.icon} key={i}>
            {menuTab.content}
          </MantineTabs.Tab>
        ) : (
          <MantineTabs.Tab label={menuTab.label} key={i}>
            {menuTab.content}
          </MantineTabs.Tab>
        )
      )}
    </MantineTabs>
  );
}

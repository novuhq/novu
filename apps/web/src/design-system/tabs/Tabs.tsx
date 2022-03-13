import { LoadingOverlay, MantineMargins, Tabs as MantineTabs } from '@mantine/core';
import React, { ReactNode } from 'react';
import useStyles from './Tabs.styles';
import { colors } from '../config';

interface IMenuButtonProp {
  label: string;
  content?: ReactNode | string;
  icon?: ReactNode | string;
}

interface ITabsProp extends MantineMargins {
  menuTabs: IMenuButtonProp[];
  orientation?: 'horizontal' | 'vertical';
  active?: number;
  onTabChange?: (tabIndex: number, tabKey?: string) => void;
  position?: 'right' | 'center' | 'left' | 'apart';
  withIcon?: boolean;
  loading?: boolean;
}

export function Tabs({
  menuTabs,
  active,
  onTabChange,
  orientation = 'horizontal',
  withIcon = false,
  position = 'left',
  loading = false,
}: ITabsProp) {
  const { classes, theme } = useStyles(withIcon);

  return (
    <div style={{ position: 'relative', minHeight: 'inherit' }}>
      <LoadingOverlay
        visible={loading}
        overlayColor={theme.colorScheme === 'dark' ? colors.B30 : colors.B98}
        loaderProps={{
          color: colors.error,
        }}
      />
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
    </div>
  );
}

import { LoadingOverlay, Tabs as MantineTabs, TabsValue } from '@mantine/core';
import React, { ReactNode } from 'react';
import { useTabsStyles } from './Tabs.styles';
import { colors } from '../config';
import { SpacingProps } from '../shared/spacing.props';

interface IMenuButtonProp {
  value: string;
  content?: ReactNode | string;
  icon?: ReactNode | string;
}

interface ITabsProp extends SpacingProps {
  menuTabs: IMenuButtonProp[];
  orientation?: 'horizontal' | 'vertical';
  value?: string | null;
  defaultValue?: string | null;
  onTabChange?: (value: TabsValue) => void;
  withIcon?: boolean;
  loading?: boolean;
  keepMounted?: boolean;
}

export const Tabs = React.forwardRef<HTMLDivElement, ITabsProp>(
  (
    {
      menuTabs,
      value,
      defaultValue,
      onTabChange,
      orientation = 'horizontal',
      withIcon = false,
      loading = false,
      keepMounted = true,
    }: ITabsProp,
    ref
  ) => {
    const { classes, theme } = useTabsStyles(withIcon);

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
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onTabChange={onTabChange}
          variant="default"
          classNames={classes}
          keepMounted={keepMounted}
        >
          <MantineTabs.List>
            {menuTabs.map((menuTab, i) =>
              withIcon ? (
                <MantineTabs.Tab value={menuTab.value} icon={menuTab.icon} key={i}>
                  {menuTab.value}
                </MantineTabs.Tab>
              ) : (
                <MantineTabs.Tab value={menuTab.value} key={i}>
                  {menuTab.value}
                </MantineTabs.Tab>
              )
            )}
          </MantineTabs.List>
          {menuTabs.map((menuTab, i) => (
            <MantineTabs.Panel value={menuTab.value} key={i}>
              {menuTab.content}
            </MantineTabs.Panel>
          ))}
        </MantineTabs>
      </div>
    );
  }
);

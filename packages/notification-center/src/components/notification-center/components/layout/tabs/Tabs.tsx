import React from 'react';
import { Tabs as MantineTabs, TabsValue } from '@mantine/core';
import { css, cx } from '@emotion/css';

import useTabStyles from './Tabs.styles';
import { useNovuTheme } from '../../../../../hooks';
import { useStyles } from '../../../../../store/styles';

interface ITabsProps {
  children: React.ReactNode;
  onTabChange?: (value: TabsValue) => void;
  value: string;
}

export function Tabs({ children, onTabChange, value }: ITabsProps) {
  const { theme: novuTheme, common, colorScheme } = useNovuTheme();
  const { classes } = useTabStyles({ novuTheme, common, colorScheme });
  const [tabsListStyles, tabStyles, tabLabelStyles, tabIconStyles] = useStyles([
    'tabs.tabsList',
    'tabs.tab',
    'tabs.tabLabel',
    'tabs.tabIcon',
  ]);
  const overrideClasses: Record<'tabsList' | 'tab' | 'tabLabel' | 'tabIcon', string> = {
    tabsList: cx(classes.tabsList, css(tabsListStyles)),
    tab: cx(classes.tab, css(tabStyles)),
    tabLabel: cx(classes.tabLabel, css(tabLabelStyles)),
    tabIcon: cx(classes.tabIcon, css(tabIconStyles)),
  };

  return (
    <MantineTabs
      onTabChange={onTabChange}
      defaultValue={value}
      keepMounted={false}
      variant="default"
      classNames={overrideClasses}
    >
      {children}
    </MantineTabs>
  );
}

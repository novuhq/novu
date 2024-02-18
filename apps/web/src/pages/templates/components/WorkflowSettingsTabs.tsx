import { Tabs } from '@mantine/core';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTabsStyles } from '@novu/design-system';
import { useBasePath } from '../hooks/useBasePath';

export const WorkflowSettingsTabs = () => {
  const { classes } = useTabsStyles(false);
  const basePath = useBasePath();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const value = useMemo(() => {
    return pathname.replace(basePath + '/', '');
  }, [pathname, basePath]);

  return (
    <Tabs
      orientation="horizontal"
      keepMounted={true}
      onTabChange={(tabValue) => {
        navigate(basePath + '/' + tabValue);
      }}
      variant="default"
      value={value}
      classNames={classes}
    >
      <Tabs.List>
        <Tabs.Tab value="settings">General</Tabs.Tab>
        <Tabs.Tab value="channels">Channels</Tabs.Tab>
        <Tabs.Tab value="providers">Providers</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
};

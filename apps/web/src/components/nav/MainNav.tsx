import { ROUTES } from '@novu/shared-web';
import { FC } from 'react';
import { RootNavMenu } from './RootNavMenu';
import { SettingsNavMenu } from './SettingsNavMenu';
import { SidebarNav } from './SidebarNav';

export const MainNav: FC = () => {
  return <SidebarNav root={<RootNavMenu />} routeMenus={{ [ROUTES.SETTINGS]: <SettingsNavMenu /> }} />;
};

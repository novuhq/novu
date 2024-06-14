import { ROUTES } from '../../constants/routes';
import { FC } from 'react';
import { LocalNavMenu } from '../../studio/components/LocalNavMenu';
import { RootNavMenu } from './RootNavMenu';
import { SettingsNavMenu } from './SettingsNavMenu';
import { SidebarNav } from './SidebarNav';

export const MainNav: FC = () => {
  return (
    <SidebarNav
      root={<RootNavMenu />}
      routeMenus={{ [ROUTES.SETTINGS]: <SettingsNavMenu />, [ROUTES.STUDIO]: <LocalNavMenu /> }}
    />
  );
};

import { useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { RootNavMenu } from './RootNavMenu';
import { SettingsNavMenu } from './SettingsNavMenu';
import { Aside } from './Aside';

export const Sidebar = () => {
  const { pathname } = useLocation();

  if (
    pathname.startsWith(
      ROUTES.PARTNER_INTEGRATIONS_VERCEL_LINK_PROJECTS || ROUTES.PARTNER_INTEGRATIONS_VERCEL_LINK_PROJECTS_EDIT
    )
  ) {
    return null;
  }

  return <Aside>{pathname.startsWith(ROUTES.SETTINGS) ? <SettingsNavMenu /> : <RootNavMenu />}</Aside>;
};

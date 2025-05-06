import { useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { RootNavMenu } from './RootNavMenu';
import { SettingsNavMenu } from './SettingsNavMenu';
import { Aside } from './Aside';

export const Sidebar = () => {
  const { pathname } = useLocation();

  return <Aside>{pathname.startsWith(ROUTES.SETTINGS) ? <SettingsNavMenu /> : <RootNavMenu />}</Aside>;
};

import { useLocation } from 'react-router-dom';
import { css } from '@novu/novui/css';
import { ROUTES } from '../../constants/routes';
import { LocalNavMenu } from '../../studio/components/LocalNavMenu';
import { RootNavMenu } from './RootNavMenu';
import { SettingsNavMenu } from './SettingsNavMenu';

const className = css({
  position: 'sticky',
  top: 0,
  zIndex: 'auto',
  backgroundColor: 'transparent',
  borderRight: 'none',
  width: '272px',
  height: '100%',
  p: '100',
  bg: 'surface.panel',
  overflowY: 'auto',
});

export const Sidebar = () => {
  const { pathname } = useLocation();

  if (
    pathname.startsWith(
      ROUTES.PARTNER_INTEGRATIONS_VERCEL_LINK_PROJECTS || ROUTES.PARTNER_INTEGRATIONS_VERCEL_LINK_PROJECTS_EDIT
    )
  ) {
    return null;
  }

  let Variant = RootNavMenu;

  if (pathname.startsWith(ROUTES.SETTINGS)) {
    Variant = SettingsNavMenu;
  } else if (pathname.startsWith(ROUTES.STUDIO)) {
    Variant = LocalNavMenu;
  }

  return (
    <aside className={className}>
      <Variant />
    </aside>
  );
};

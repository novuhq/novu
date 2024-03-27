import { ROUTES } from '@novu/shared-web';
import { FC, useMemo } from 'react';
import { matchRoutes, useLocation } from 'react-router-dom';
import { css } from '../../styled-system/css';

const sidebarStyle = css({
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

type RouteValue = (typeof ROUTES)[keyof typeof ROUTES];

interface ISidebarNavProps {
  root: JSX.Element;
  routeMenus?: Partial<Record<RouteValue, JSX.Element>>;
}

export const SidebarNav: FC<ISidebarNavProps> = ({ root, routeMenus }) => {
  const location = useLocation();

  // if any nested menus are passed (via routeMenus), see if the current location matches any of them.
  const pageMatches = useMemo(() => {
    const paths = routeMenus ? Object.keys(routeMenus).map((path) => ({ path: `${path}/*` })) : [];

    return matchRoutes(paths, location) ?? [];
  }, [location, routeMenus]);

  return (
    <aside className={sidebarStyle}>
      {
        /* determine which menu to show based on pageMatches (if any) */
        routeMenus && pageMatches.length > 0 ? routeMenus[pageMatches[0].pathnameBase] : root
      }
    </aside>
  );
};

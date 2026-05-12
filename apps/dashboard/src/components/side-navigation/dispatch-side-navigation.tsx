import { RiDashboardLine, RiDiscussLine, RiKey2Line, RiRobot2Line, RiSettings4Line } from 'react-icons/ri';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { BottomSection } from './bottom-section';
import { NavigationGroup } from './navigation-group';
import { NavigationLink } from './navigation-link';
import { OrganizationDropdown } from './organization-dropdown';

export const DispatchSideNavigation = () => {
  const { currentEnvironment } = useEnvironment();
  const envSlug = currentEnvironment?.slug;

  const buildEnvRoute = (route: string) => (envSlug ? buildRoute(route, { environmentSlug: envSlug }) : undefined);

  return (
    <aside className="relative flex h-full w-[275px] shrink-0 flex-col">
      <SidebarContent className="h-full">
        <OrganizationDropdown />
        <nav className="flex h-full flex-1 flex-col overflow-auto">
          <div className="flex flex-col gap-4">
            <NavigationGroup>
              <NavigationLink to={buildEnvRoute(ROUTES.DISPATCH_HOME)}>
                <RiDashboardLine className="size-4" />
                <span>Dashboard</span>
              </NavigationLink>
            </NavigationGroup>
            <NavigationGroup label="Manage">
              <NavigationLink to={buildEnvRoute(ROUTES.DISPATCH_AGENTS)}>
                <RiRobot2Line className="size-4" />
                <span>Agents</span>
              </NavigationLink>
            </NavigationGroup>
            <NavigationGroup label="Monitor">
              <NavigationLink to={buildEnvRoute(ROUTES.DISPATCH_CONVERSATIONS)}>
                <RiDiscussLine className="size-4" />
                <span>Conversations</span>
              </NavigationLink>
            </NavigationGroup>
            <NavigationGroup label="Application">
              <NavigationLink to={buildEnvRoute(ROUTES.DISPATCH_API_KEYS)}>
                <RiKey2Line className="size-4" />
                <span>API Keys</span>
              </NavigationLink>
              <NavigationLink to={buildEnvRoute(ROUTES.DISPATCH_SETTINGS)}>
                <RiSettings4Line className="size-4" />
                <span>Settings</span>
              </NavigationLink>
            </NavigationGroup>
          </div>

          <BottomSection />
        </nav>
      </SidebarContent>
    </aside>
  );
};

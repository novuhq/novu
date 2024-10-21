import React, { ReactNode, useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { cva } from 'class-variance-authority';
import {
  RiBarChartBoxLine,
  RiGroup2Line,
  RiKey2Line,
  RiRouteFill,
  RiSettings4Line,
  RiStore3Line,
  RiUserAddLine,
} from 'react-icons/ri';
import { cn } from '@/utils/ui';
import { EnvironmentDropdown } from './environment-dropdown';
import { useEnvironment } from '@/context/environment/hooks';
import { OrganizationDropdown } from './organization-dropdown';
import { FreeTrialCard } from './free-trial-card';
import { buildRoute, LEGACY_ROUTES, ROUTES } from '@/utils/routes';
import { SubscribersStayTunedModal } from './subscribers-stay-tuned-modal';
import { TelemetryEvent } from '@/utils/telemetry';
import { useTelemetry } from '@/hooks/use-telemetry';

const linkVariants = cva(
  `flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer`,
  {
    variants: {
      variant: {
        default: 'text-foreground-600/95 transition ease-out duration-300 hover:bg-accent',
        selected: 'text-foreground-950 transition ease-out duration-300 hover:bg-accent',
        disabled: 'text-foreground-300 cursor-help',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type NavLinkProps = {
  to?: string;
  isExternal?: boolean;
  className?: string;
  children: React.ReactNode;
};

const NavigationLink = ({ to, isExternal, className, children }: NavLinkProps) => {
  const { pathname } = useLocation();
  const isSelected = pathname === to;
  const variant = isSelected ? 'selected' : 'default';

  const classNames = cn(linkVariants({ variant, className }));
  if (!to) {
    return <span className={classNames}>{children}</span>;
  }

  if (isExternal) {
    return (
      <a
        href={to}
        className={classNames}
        target={to.startsWith('https') ? '_blank' : '_self'}
        rel="noreferrer noopener"
      >
        {children}
      </a>
    );
  }
  return (
    <RouterLink to={to ?? '/'} className={classNames}>
      {children}
    </RouterLink>
  );
};

const NavigationGroup = ({ children, label }: { children: ReactNode; label?: string }) => {
  return (
    <div className="flex flex-col last:mt-auto">
      {!!label && <span className="text-foreground-400 px-2 py-1 text-sm">{label}</span>}
      {children}
    </div>
  );
};

export const SideNavigation = () => {
  const { currentEnvironment, environments, switchEnvironment } = useEnvironment();
  const track = useTelemetry();
  const environmentNames = useMemo(() => environments?.map((env) => env.name), [environments]);
  const onEnvironmentChange = (value: string) => {
    const environment = environments?.find((env) => env.name === value);
    switchEnvironment(environment?._id);
  };

  return (
    <aside className="bg-neutral-alpha-50 relative flex w-[275px] flex-shrink-0 flex-col gap-3 px-2 pb-3 pt-1.5">
      <FreeTrialCard />
      <OrganizationDropdown />
      <EnvironmentDropdown value={currentEnvironment?.name} data={environmentNames} onChange={onEnvironmentChange} />
      <nav className="flex flex-1 flex-col gap-4">
        <NavigationGroup>
          <NavigationLink to={buildRoute(ROUTES.WORKFLOWS, { environmentId: currentEnvironment?._id ?? '' })}>
            <RiRouteFill className="size-4" />
            <span>Workflows</span>
          </NavigationLink>
          <SubscribersStayTunedModal>
            <span onClick={() => track(TelemetryEvent.SUBSCRIBERS_LINK_CLICKED)}>
              <NavigationLink>
                <RiGroup2Line className="size-4" />
                <span>Subscribers</span>
              </NavigationLink>
            </span>
          </SubscribersStayTunedModal>
        </NavigationGroup>
        <NavigationGroup label="Monitor">
          <NavigationLink to={LEGACY_ROUTES.ACTIVITY_FEED} isExternal>
            <RiBarChartBoxLine className="size-4" />
            <span>Activity Feed</span>
          </NavigationLink>
        </NavigationGroup>
        <NavigationGroup label="Developer">
          <NavigationLink to={LEGACY_ROUTES.INTEGRATIONS} isExternal>
            <RiStore3Line className="size-4" />
            <span>Integration Store</span>
          </NavigationLink>
          <NavigationLink to={LEGACY_ROUTES.API_KEYS} isExternal>
            <RiKey2Line className="size-4" />
            <span>API Keys</span>
          </NavigationLink>
        </NavigationGroup>
        <NavigationGroup label="Application">
          <NavigationLink to={LEGACY_ROUTES.SETTINGS} isExternal>
            <RiSettings4Line className="size-4" />
            <span>Settings</span>
          </NavigationLink>
        </NavigationGroup>
        <NavigationGroup>
          <NavigationLink to={LEGACY_ROUTES.INVITE_TEAM_MEMBERS} isExternal>
            <RiUserAddLine className="size-4" />
            <span>Invite teammates</span>
          </NavigationLink>
        </NavigationGroup>
      </nav>
    </aside>
  );
};

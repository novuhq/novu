import { Fragment, ReactNode, useEffect, useState } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import { useLocation } from 'react-router-dom';
import { HeaderNavigation } from '@/components/header-navigation/header-navigation';
import { MobileDesktopPrompt } from '@/components/mobile-desktop-prompt';
import { ConnectSideNavigation } from '@/components/side-navigation/connect-side-navigation';
import { LegacySideNavigation } from '@/components/side-navigation/side-navigation';
import { useEnvironment } from '@/context/environment/hooks';
import { useCurrentApp } from '@/hooks/use-current-app';
import {
  APP_IDS,
  type AppId,
  CONNECT_SECTION_LABELS,
  type ConnectSectionId,
  getConnectSectionFromPathname,
} from '@/utils/apps';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { useCommandPalette } from '../command-palette/hooks/use-command-palette';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../primitives/breadcrumb';
import { Button } from '../primitives/button';
import { Kbd } from '../primitives/kbd';
import { AppRail } from './app-rail';
import { useConnectBreadcrumbLeaf } from './use-connect-breadcrumb';

type DashboardShellProps = {
  children: ReactNode;
  headerStartItems?: ReactNode;
  showSideNavigation?: boolean;
  showBridgeUrl?: boolean;
};

// Each page renders its own DashboardShell, so the side nav remounts on every
// navigation. We track the last-seen app at module scope so that on remount we
// can detect an app switch and animate only in that case.
let lastSeenAppId: AppId | undefined;

function useDidAppJustSwitch(appId: AppId): boolean {
  const [previousAppId] = useState(() => lastSeenAppId);

  useEffect(() => {
    lastSeenAppId = appId;
  }, [appId]);

  return previousAppId !== undefined && previousAppId !== appId;
}

const CONNECT_SECTION_ROUTES: Record<ConnectSectionId, keyof typeof ROUTES> = {
  dashboard: 'CONNECT_HOME',
  agents: 'CONNECT_AGENTS',
  conversations: 'CONNECT_CONVERSATIONS',
  'api-keys': 'CONNECT_API_KEYS',
  settings: 'CONNECT_SETTINGS',
};

type ConnectBreadcrumbEntry = {
  key: string;
  label: string;
  icon?: ReactNode;
  to?: string;
};

export function DashboardShell({
  children,
  headerStartItems,
  showSideNavigation = true,
  showBridgeUrl = true,
}: DashboardShellProps) {
  const appId = useCurrentApp();
  const didAppJustSwitch = useDidAppJustSwitch(appId);
  const SideNav = appId === APP_IDS.CONNECT ? ConnectSideNavigation : LegacySideNavigation;
  const { currentEnvironment } = useEnvironment();
  const { openCommandPalette } = useCommandPalette();
  const location = useLocation();
  const connectLeaf = useConnectBreadcrumbLeaf();
  const envSlug = currentEnvironment?.slug ?? '';
  const connectSection = getConnectSectionFromPathname(location.pathname);
  const connectHomeUrl = buildRoute(ROUTES.CONNECT_HOME, { environmentSlug: envSlug });
  const sectionRouteTemplate = ROUTES[CONNECT_SECTION_ROUTES[connectSection]];
  const sectionUrl = buildRoute(sectionRouteTemplate, { environmentSlug: envSlug });

  const connectBreadcrumbItems: ConnectBreadcrumbEntry[] = [
    { key: 'root', label: 'Connect', to: connectHomeUrl },
    {
      key: 'section',
      label: CONNECT_SECTION_LABELS[connectSection],
      to: connectLeaf ? sectionUrl : undefined,
    },
  ];

  if (connectLeaf) {
    connectBreadcrumbItems.push({ key: 'leaf', label: connectLeaf.label, icon: connectLeaf.icon });
  }

  const connectLastIndex = connectBreadcrumbItems.length - 1;

  return (
    <div className="relative flex h-full w-full bg-bg-muted">
      <AppRail />
      {showSideNavigation && (
        <div className="hidden md:block my-2 rounded-md bg-bg-weak">
          <div
            key={appId}
            className={cn(
              'h-full',
              didAppJustSwitch &&
                'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-4 motion-safe:duration-300 motion-safe:ease-out'
            )}
          >
            <SideNav />
          </div>
        </div>
      )}
      <div className="flex flex-1 flex-col m-2 overflow-y-auto overflow-x-hidden bg-bg-white rounded-md">
        {appId === APP_IDS.NOVU ? (
          <HeaderNavigation
            startItems={headerStartItems}
            hideBridgeUrl={!showBridgeUrl}
            showMobileNav={showSideNavigation}
            hideRestItems
          />
        ) : (
          <Breadcrumb className="min-w-0 py-3 px-2.5 pb-[10px] border-b border-b-neutral-200">
            <BreadcrumbList>
              {connectBreadcrumbItems.map((item, index) => {
                const isLast = index === connectLastIndex;

                return (
                  <Fragment key={item.key}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem className="min-w-0">
                      {isLast ? (
                        <BreadcrumbPage className="flex min-w-0 items-center gap-1.5">
                          {item.icon}
                          <span className="truncate">{item.label}</span>
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink to={item.to ?? '#'} className="flex min-w-0 items-center gap-1.5 text-text-sub">
                          {item.icon}
                          <span className="truncate">{item.label}</span>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                );
              })}
              <BreadcrumbItem className="min-w-0 ml-auto">
                <BreadcrumbPage className="flex min-w-0 items-center gap-1.5 ">
                  <Button
                    variant="secondary"
                    mode="outline"
                    className="hidden h-[26px] px-[5px] md:inline-flex"
                    size="2xs"
                    onClick={openCommandPalette}
                  >
                    <RiSearchLine className="size-3 text-text-sub" />
                    <Kbd className="bg-bg-weak rounded-4 h-[16px]">⌘K</Kbd>
                  </Button>
                  <Button
                    variant="secondary"
                    mode="outline"
                    className="h-[26px] px-[5px] md:hidden"
                    size="2xs"
                    onClick={openCommandPalette}
                  >
                    <RiSearchLine className="size-3 text-text-sub" />
                  </Button>
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}
        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-2">{children}</div>
      </div>
      <MobileDesktopPrompt />
    </div>
  );
}

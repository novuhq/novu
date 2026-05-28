import { AppSwitcherTooltipContent } from '@/components/dashboard-shell/app-switcher-tooltip-content';
import { ConnectSwitchConfirmationModal } from '@/components/dashboard-shell/connect-switch-confirmation-modal';
import { CrossAppLink } from '@/components/dashboard-shell/cross-app-link';
import { CustomerSupportButton } from '@/components/header-navigation/customer-support-button';
import { ConnectLogo } from '@/components/icons/connect-logo';
import { LogoCircle } from '@/components/icons/logo-circle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { UserProfile } from '@/components/user-profile';
import { IS_ENTERPRISE, IS_HOSTNAME_SPLIT_ENABLED, IS_SELF_HOSTED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useConnectSwitchConfirmation } from '@/hooks/use-connect-switch-confirmation';
import { APP_IDS, type AppId, buildAppHomeRoute, buildOtherAppExternalUrl } from '@/utils/apps';
import { ComponentType } from 'react';

import { useCurrentApp } from '../../hooks/use-current-app';

type BrandIcon = ComponentType<{ className?: string }>;

type BrandConfig = {
  id: AppId;
  Icon: BrandIcon;
  label: string;
  tooltip: string;
  subtitle: string;
  features: string[];
};

const PLATFORM_BRAND: BrandConfig = {
  id: APP_IDS.NOVU,
  Icon: LogoCircle,
  label: 'Novu Platform',
  tooltip: 'Open Novu Platform',
  subtitle: 'Notifications for your product',
  features: [
    'Email, push, and in-app workflows.',
    'Embed Novu Inbox directly in your product.',
    'Manage subscribers and deliver at scale.',
  ],
};

const CONNECT_BRAND: BrandConfig = {
  id: APP_IDS.CONNECT,
  Icon: ConnectLogo,
  label: 'Novu Connect',
  tooltip: 'Open Novu Connect',
  subtitle: 'Agents for your team',
  features: [
    'Best for internal agents and within your team.',
    'Connect your agent to where you work.',
    'Connect the tools your team works on.',
  ],
};

type BrandTileProps = {
  brand: BrandConfig;
};

function BrandTile({ brand }: BrandTileProps) {
  const { Icon, label } = brand;

  return (
    <span
      role="img"
      aria-label={label}
      aria-current="page"
      className="bg-bg-weak border-stroke-weak flex size-10 items-center justify-center rounded-lg border"
    >
      <Icon className="size-7" aria-hidden />
    </span>
  );
}

type SwitcherTileProps = {
  brand: BrandConfig;
  to: string | undefined;
  isExternal: boolean;
  openInNewTab?: boolean;
};

function SwitcherTile({ brand, to, isExternal, openInNewTab = false }: SwitcherTileProps) {
  const { Icon, label, tooltip, subtitle, features } = brand;
  const { isModalOpen, setIsModalOpen, handleSwitcherClick, handleConfirm, showConnectSwitchModal } =
    useConnectSwitchConfirmation({
      targetAppId: brand.id,
      href: to ?? '',
      openInNewTab: isExternal && openInNewTab,
    });

  const content = (
    <span className="group hover:bg-bg-weak flex size-10 items-center justify-center rounded-lg transition-colors">
      <Icon
        className="size-7 grayscale transition-[filter] duration-200 ease-out group-hover:grayscale-0"
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </span>
  );

  if (!to) {
    // `to` is undefined only while the current environment hasn't resolved yet
    // (see buildAppHomeRoute / buildOtherAppExternalUrl in @/utils/apps).
    const disabledMessage = `${tooltip} — unavailable until your environment is ready`;

    return (
      <button
        type="button"
        aria-disabled="true"
        aria-label={disabledMessage}
        title={disabledMessage}
        className="cursor-not-allowed opacity-50"
      >
        {content}
      </button>
    );
  }

  return (
    <>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <CrossAppLink
            href={to}
            openInNewTab={isExternal && openInNewTab}
            onClick={handleSwitcherClick}
            aria-label={tooltip}
            className="focus-visible:ring-ring rounded-lg focus-visible:ring-2 focus-visible:outline-hidden"
          >
            {content}
          </CrossAppLink>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          align="start"
          sideOffset={8}
          variant="light"
          size="lg"
          className="border-stroke-weak w-auto overflow-hidden rounded-lg border p-0 shadow-md"
        >
          <AppSwitcherTooltipContent label={label} subtitle={subtitle} features={features} />
        </TooltipContent>
      </Tooltip>
      {showConnectSwitchModal ? (
        <ConnectSwitchConfirmationModal open={isModalOpen} onOpenChange={setIsModalOpen} onConfirm={handleConfirm} />
      ) : null}
    </>
  );
}

export function AppRail() {
  const currentApp = useCurrentApp();
  const { currentEnvironment } = useEnvironment();
  const envSlug = currentEnvironment?.slug;

  const isConnect = currentApp === APP_IDS.CONNECT;
  const currentBrand = isConnect ? CONNECT_BRAND : PLATFORM_BRAND;
  const otherBrand = isConnect ? PLATFORM_BRAND : CONNECT_BRAND;

  // Route through org-list so the destination resolves the right product workspace first.
  const otherAppHref = IS_HOSTNAME_SPLIT_ENABLED
    ? buildOtherAppExternalUrl(otherBrand.id, envSlug, { useOrgResolutionEntry: true })
    : buildAppHomeRoute(otherBrand.id, envSlug);
  const openCrossOriginInNewTab = false;

  return (
    <aside className="hidden h-full w-14 shrink-0 flex-col items-center justify-between py-2 md:flex" aria-label="Apps">
      <nav aria-label="App switcher" className="flex flex-col items-center gap-2 p-2">
        <BrandTile brand={currentBrand} />
        <SwitcherTile
          brand={otherBrand}
          to={otherAppHref}
          isExternal={IS_HOSTNAME_SPLIT_ENABLED}
          openInNewTab={openCrossOriginInNewTab}
        />
      </nav>

      <div className="flex flex-col items-center gap-3">
        {!(IS_SELF_HOSTED && IS_ENTERPRISE) && <CustomerSupportButton />}
        <UserProfile />
      </div>
    </aside>
  );
}

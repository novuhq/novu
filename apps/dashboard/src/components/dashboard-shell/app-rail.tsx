import { ComponentType, SVGProps } from 'react';
import { CustomerSupportButton } from '@/components/header-navigation/customer-support-button';
import { ConnectLogo } from '@/components/icons/connect-logo';
import { LogoCircle } from '@/components/icons/logo-circle';
import { InboxButton } from '@/components/inbox-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { UserProfile } from '@/components/user-profile';
import { IS_ENTERPRISE, IS_HOSTNAME_SPLIT_ENABLED, IS_SELF_HOSTED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { APP_IDS, type AppId, buildAppHomeRoute, buildOtherAppExternalUrl } from '@/utils/apps';

import { useCurrentApp } from '../../hooks/use-current-app';

type BrandIcon = ComponentType<SVGProps<SVGSVGElement>>;

type BrandConfig = {
  id: AppId;
  Icon: BrandIcon;
  label: string;
  tooltip: string;
};

// Each tile is 40x40 with a 20x20 icon centered inside it (matches Figma nodes 7302:35199 and
// 7302:35237). Both brands always render their full-color logo — see the user-facing rule that
// the Novu mark must never be greyed out, even when used as the switcher target in Connect.
const PLATFORM_BRAND: BrandConfig = {
  id: APP_IDS.NOVU,
  Icon: LogoCircle,
  label: 'Novu Platform',
  tooltip: 'Open Novu Platform',
};

const CONNECT_BRAND: BrandConfig = {
  id: APP_IDS.CONNECT,
  Icon: ConnectLogo,
  label: 'Novu Connect',
  tooltip: 'Open Novu Connect',
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
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

type SwitcherTileProps = {
  brand: BrandConfig;
  to: string | undefined;
  isExternal: boolean;
};

function SwitcherTile({ brand, to, isExternal }: SwitcherTileProps) {
  const { Icon, label, tooltip } = brand;

  // Figma node 7302:35237: switcher tile has no border/background — only a subtle hover state
  // for affordance. The icon stays at full saturation in both states.
  const content = (
    <span className="hover:bg-bg-weak flex size-10 items-center justify-center rounded-lg transition-colors">
      <Icon className="size-5" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );

  return (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>
        {to ? (
          <a
            href={to}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            aria-label={tooltip}
            className="focus-visible:ring-ring rounded-lg focus-visible:ring-2 focus-visible:outline-hidden"
          >
            {content}
          </a>
        ) : (
          <span className="cursor-not-allowed opacity-50">{content}</span>
        )}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={6}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function AppRail() {
  const currentApp = useCurrentApp();
  const { currentEnvironment } = useEnvironment();
  const envSlug = currentEnvironment?.slug;

  const isConnect = currentApp === APP_IDS.CONNECT;
  const currentBrand = isConnect ? CONNECT_BRAND : PLATFORM_BRAND;
  const otherBrand = isConnect ? PLATFORM_BRAND : CONNECT_BRAND;

  // When the hostname split is configured we always want a full URL so the switcher crosses
  // origins (and opens in a new tab). Without the split we fall back to an in-app route so dev
  // and self-hosted setups keep working from a single origin.
  const otherAppHref = IS_HOSTNAME_SPLIT_ENABLED
    ? buildOtherAppExternalUrl(otherBrand.id, envSlug)
    : buildAppHomeRoute(otherBrand.id, envSlug);

  return (
    <aside className="hidden h-full w-14 shrink-0 flex-col items-center justify-between py-2 md:flex" aria-label="Apps">
      <nav aria-label="App switcher" className="flex flex-col items-center gap-2 p-2">
        <BrandTile brand={currentBrand} />
        <SwitcherTile brand={otherBrand} to={otherAppHref} isExternal={IS_HOSTNAME_SPLIT_ENABLED} />
      </nav>

      <div className="flex flex-col items-center gap-3">
        {!(IS_SELF_HOSTED && IS_ENTERPRISE) && <CustomerSupportButton />}
        <InboxButton align="start" side="top" />
        <UserProfile />
      </div>
    </aside>
  );
}

import { FeatureFlagsKeysEnum } from '@novu/shared';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ComponentType, useEffect, useState } from 'react';
import { RiArrowRightUpLine, RiMenuLine } from 'react-icons/ri';
import { useLocation } from 'react-router-dom';
import { ConnectSwitchConfirmationModal } from '@/components/dashboard-shell/connect-switch-confirmation-modal';
import { CrossAppLink } from '@/components/dashboard-shell/cross-app-link';
import { ConnectLogo } from '@/components/icons/connect-logo';
import { LogoCircle } from '@/components/icons/logo-circle';
import { Sheet, SheetContent, SheetTitle } from '@/components/primitives/sheet';
import { IS_HOSTNAME_SPLIT_ENABLED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useConnectSwitchConfirmation } from '@/hooks/use-connect-switch-confirmation';
import { useCurrentApp } from '@/hooks/use-current-app';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { APP_IDS, type AppId, buildAppHomeRoute, buildOtherAppExternalUrl } from '@/utils/apps';
import { ConnectSideNavigation } from './connect-side-navigation';
import { LegacySideNavigation } from './side-navigation';

type MobileBrand = {
  id: AppId;
  Icon: ComponentType<{ className?: string }>;
  label: string;
};

const PLATFORM_BRAND: MobileBrand = {
  id: APP_IDS.NOVU,
  Icon: LogoCircle,
  label: 'Novu Platform',
};

const CONNECT_BRAND: MobileBrand = {
  id: APP_IDS.CONNECT,
  Icon: ConnectLogo,
  label: 'Novu Connect',
};

function MobileAppSwitcher() {
  const currentApp = useCurrentApp();
  const { currentEnvironment } = useEnvironment();
  const envSlug = currentEnvironment?.slug;

  const isConnect = currentApp === APP_IDS.CONNECT;
  const currentBrand = isConnect ? CONNECT_BRAND : PLATFORM_BRAND;
  const otherBrand = isConnect ? PLATFORM_BRAND : CONNECT_BRAND;

  const otherHref = IS_HOSTNAME_SPLIT_ENABLED
    ? buildOtherAppExternalUrl(otherBrand.id, envSlug, { useOrgResolutionEntry: true })
    : buildAppHomeRoute(otherBrand.id, envSlug);

  const { Icon: CurrentIcon } = currentBrand;
  const { Icon: OtherIcon } = otherBrand;
  const { isModalOpen, setIsModalOpen, handleSwitcherClick, handleConfirm, showConnectSwitchModal } =
    useConnectSwitchConfirmation({
      targetAppId: otherBrand.id,
      href: otherHref ?? '',
      openInNewTab: false,
    });

  return (
    <nav
      aria-label="App switcher"
      className="border-b-stroke-soft flex items-center justify-between gap-2 border-b px-3 py-2"
    >
      <span
        aria-current="page"
        className="bg-bg-weak border-stroke-weak flex items-center gap-2 rounded-md border px-2 py-1.5"
      >
        <CurrentIcon className="size-4" aria-hidden />
        <span className="text-foreground-950 text-sm font-medium">{currentBrand.label}</span>
      </span>

      {otherHref ? (
        <>
          <CrossAppLink
            href={otherHref}
            openInNewTab={false}
            onClick={handleSwitcherClick}
            className="text-foreground-600 hover:bg-bg-weak hover:text-foreground-950 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors"
            aria-label={`Open ${otherBrand.label}`}
          >
            <OtherIcon className="size-4" aria-hidden />
            <span>{otherBrand.label}</span>
            {IS_HOSTNAME_SPLIT_ENABLED && <RiArrowRightUpLine className="text-foreground-400 size-3.5" aria-hidden />}
          </CrossAppLink>
          {showConnectSwitchModal ? (
            <ConnectSwitchConfirmationModal
              open={isModalOpen}
              onOpenChange={setIsModalOpen}
              onConfirm={handleConfirm}
            />
          ) : null}
        </>
      ) : null}
    </nav>
  );
}

export function MobileSideNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();
  const isShellV2FlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONNECT_DASHBOARD_ENABLED, false);
  const isShellV2 = IS_HOSTNAME_SPLIT_ENABLED && isShellV2FlagEnabled;
  const appId = useCurrentApp();

  useEffect(() => {
    if (pathname) {
      setIsOpen(false);
    }
  }, [pathname]);

  const SideNav = isShellV2 && appId === APP_IDS.CONNECT ? ConnectSideNavigation : LegacySideNavigation;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex size-8 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 md:hidden"
        aria-label="Open navigation"
      >
        <RiMenuLine className="size-5" />
      </button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-[225px] p-0 sm:max-w-[225px]">
          <VisuallyHidden>
            <SheetTitle>Navigation</SheetTitle>
          </VisuallyHidden>
          {isShellV2 ? (
            <div className="flex h-full flex-col">
              <MobileAppSwitcher />
              <div className="flex-1 overflow-hidden">
                <SideNav />
              </div>
            </div>
          ) : (
            <SideNav />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

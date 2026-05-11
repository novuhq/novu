import { FeatureFlagsKeysEnum } from '@novu/shared';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { BotMessageSquare } from 'lucide-react';
import { ComponentType, SVGProps, useEffect, useState } from 'react';
import { RiMenuLine } from 'react-icons/ri';
import { Link, useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetTitle } from '@/components/primitives/sheet';
import { useEnvironment } from '@/context/environment/hooks';
import { useCurrentApp } from '@/hooks/use-current-app';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { APP_IDS, APP_LABELS, type AppId, buildAppHomeRoute } from '@/utils/apps';
import { cn } from '@/utils/ui';
import { PlatformIcon } from '../icons/platform';
import { DispatchSideNavigation } from './dispatch-side-navigation';
import { LegacySideNavigation } from './side-navigation';

type MobileAppSwitcherItem = {
  id: AppId;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const MOBILE_APP_SWITCHER_ITEMS: MobileAppSwitcherItem[] = [
  { id: APP_IDS.NOVU, Icon: PlatformIcon },
  { id: APP_IDS.DISPATCH, Icon: BotMessageSquare },
];

function MobileAppSwitcher() {
  const currentApp = useCurrentApp();
  const { currentEnvironment } = useEnvironment();
  const envSlug = currentEnvironment?.slug;

  return (
    <nav aria-label="App switcher" className="border-b-stroke-soft flex items-center gap-2 border-b px-3 py-2">
      {MOBILE_APP_SWITCHER_ITEMS.map(({ id, Icon }) => {
        const to = buildAppHomeRoute(id, envSlug);
        const label = APP_LABELS[id];
        const isActive = currentApp === id;

        const content = (
          <span
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              'text-foreground-600 hover:bg-bg-weak',
              isActive && 'bg-bg-white border-stroke-soft text-foreground-950 shadow-xs border'
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span>{label}</span>
          </span>
        );

        if (!to) {
          return (
            <span key={id} className="opacity-50">
              {content}
            </span>
          );
        }

        return (
          <Link key={id} to={to} aria-label={label}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileSideNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();
  const isShellV2 = useFeatureFlag(FeatureFlagsKeysEnum.IS_DISPATCH_DASHBOARD_ENABLED, false);
  const appId = useCurrentApp();

  useEffect(() => {
    if (pathname) {
      setIsOpen(false);
    }
  }, [pathname]);

  const SideNav = isShellV2 && appId === APP_IDS.DISPATCH ? DispatchSideNavigation : LegacySideNavigation;

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
        <SheetContent side="left" className="w-[275px] p-0 sm:max-w-[275px]">
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

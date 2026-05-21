import { BotMessageSquare } from 'lucide-react';
import { ComponentType, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { CustomerSupportButton } from '@/components/header-navigation/customer-support-button';
import { LogoCircle } from '@/components/icons/logo-circle';
import { InboxButton } from '@/components/inbox-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { UserProfile } from '@/components/user-profile';
import { IS_ENTERPRISE, IS_SELF_HOSTED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useCurrentApp } from '@/hooks/use-current-app';
import { APP_IDS, APP_LABELS, type AppId, buildAppHomeRoute } from '@/utils/apps';
import { cn } from '@/utils/ui';
import { PlatformIcon } from '../icons/platform';

type AppRailItem = {
  id: AppId;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const APP_RAIL_ITEMS: AppRailItem[] = [
  { id: APP_IDS.CONNECT, Icon: BotMessageSquare },
  { id: APP_IDS.NOVU, Icon: PlatformIcon },
];

type AppRailLinkProps = {
  item: AppRailItem;
  to: string | undefined;
  isActive: boolean;
};

function AppRailLink({ item, to, isActive }: AppRailLinkProps) {
  const { Icon, id } = item;
  const label = APP_LABELS[id];

  const content = (
    <span
      className={cn(
        'flex size-10 items-center justify-center rounded-lg transition-colors',
        'text-foreground-600 hover:bg-bg-white hover:text-foreground-950',
        isActive && 'bg-bg-white border-stroke-soft text-foreground-950 shadow-xs border'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="size-5" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );

  return (
    <Tooltip delayDuration={2000}>
      <TooltipTrigger asChild>
        {to ? (
          <Link
            to={to}
            aria-label={label}
            className="focus-visible:ring-ring rounded-lg focus-visible:ring-2 focus-visible:outline-hidden"
          >
            {content}
          </Link>
        ) : (
          <span className="cursor-not-allowed opacity-50">{content}</span>
        )}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function AppRail() {
  const currentApp = useCurrentApp();
  const { currentEnvironment } = useEnvironment();
  const envSlug = currentEnvironment?.slug;

  return (
    <aside className="hidden h-full w-14 shrink-0 flex-col items-center justify-between py-2 md:flex" aria-label="Apps">
      <div className="flex flex-col items-center gap-3">
        <Link
          to={
            envSlug
              ? (buildAppHomeRoute(currentApp === APP_IDS.CONNECT ? APP_IDS.CONNECT : APP_IDS.NOVU, envSlug) ?? '/')
              : '/'
          }
          aria-label="Novu home"
          className="focus-visible:ring-ring rounded-md p-1 focus-visible:ring-2 focus-visible:outline-hidden"
        >
          <LogoCircle className="size-8" />
        </Link>

        <nav aria-label="App switcher" className="flex flex-col items-center gap-3">
          {APP_RAIL_ITEMS.map((item) => (
            <AppRailLink
              key={item.id}
              item={item}
              to={buildAppHomeRoute(item.id, envSlug)}
              isActive={currentApp === item.id}
            />
          ))}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-3">
        {!(IS_SELF_HOSTED && IS_ENTERPRISE) && <CustomerSupportButton />}
        <InboxButton align="start" side="top" />
        <UserProfile />
      </div>
    </aside>
  );
}

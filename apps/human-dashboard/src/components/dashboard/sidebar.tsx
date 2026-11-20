'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ComponentProps, useState, useTransition } from 'react';

import {
  CONFIGURE_PATH,
  DASHBOARD_HOME,
  FOOTER_NAV,
  findNavItem,
  MAIN_NAV,
  type NavItem,
} from '@/components/dashboard/nav';
import { Brand } from '@/components/site/brand';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { formatInboxCount } from '@/lib/inbox';
import { ONBOARDING_PATH } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

export type SidebarAgent = {
  name: string;
  /** The line under the name: "Not set up" before the first setup, then "Your agent". */
  status: string;
  /** Whether `setup` has made the agent yet. Its picture sleeps until then. */
  setUp: boolean;
  /** The picture the operator gave the agent, when there is one. */
  pictureUrl?: string;
  /** The operator left the onboarding before a host was connected. Configure is where they pick it up. */
  setupUnfinished?: boolean;
  /**
   * The operator belongs in the onboarding (`belongsInOnboarding`). The main pages would only send them there,
   * and Next draws nothing while such a page redirects, so their links go straight to it.
   */
  onboardingDue?: boolean;
  /** Threads with something the agent hasn't read: the number on Inbox, "at least" when `capped`. */
  unreadThreads?: { count: number; capped: boolean };
};

type NavigateEvent = Parameters<NonNullable<ComponentProps<typeof Link>['onNavigate']>>[0];

export function Sidebar({ agent }: { agent: SidebarAgent }) {
  const current = findNavItem(usePathname());
  const router = useRouter();
  const leadsTo = agent.onboardingDue ? ONBOARDING_PATH : undefined;
  const [leaving, startLeaving] = useTransition();
  const [clicked, setClicked] = useState<string>();

  /**
   * Leaves for the onboarding once. Nothing else shows that it is on its way, as the dashboard stays on screen
   * until that page is ready, and another click would throw the page away and ask for it all over again.
   */
  function leaveForOnboarding(event: NavigateEvent, href: string) {
    event.preventDefault();
    if (leaving) {
      return;
    }

    setClicked(href);
    startLeaving(() => router.push(ONBOARDING_PATH));
  }

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 border-b border-border bg-subtle p-3 md:sticky md:top-0 md:h-dvh md:w-62 md:border-r md:border-b-0">
      <div className="flex h-8 items-center px-1.5">
        <Brand
          href={leadsTo ?? DASHBOARD_HOME}
          onNavigate={leadsTo ? (event) => leaveForOnboarding(event, DASHBOARD_HOME) : undefined}
        />
      </div>

      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-2.5 py-[10.5px]">
        <AgentAvatar mood={agent.setUp ? 'idle' : 'asleep'} src={agent.pictureUrl} className="size-8 rounded-[9px]" />
        {/* A new key when the agent is set up, so its name fades in instead of jumping. */}
        <div key={agent.name} className="flex min-w-0 animate-overlay-in flex-col motion-reduce:animate-none">
          <span className="truncate font-mono text-xs tracking-tight text-foreground">{agent.name}</span>
          <span className="truncate text-xs tracking-tight text-muted">{agent.status}</span>
        </div>
      </div>

      <nav
        aria-label="Dashboard"
        className="flex flex-1 flex-row flex-wrap gap-1 md:flex-col md:flex-nowrap md:justify-between"
      >
        <NavList
          items={MAIN_NAV}
          current={current}
          leadsTo={leadsTo}
          onNavigate={leadsTo ? leaveForOnboarding : undefined}
          pending={leaving ? clicked : undefined}
          flagged={agent.setupUnfinished ? CONFIGURE_PATH : undefined}
          counts={{
            [DASHBOARD_HOME]: agent.unreadThreads
              ? formatInboxCount(agent.unreadThreads.count, agent.unreadThreads.capped)
              : '',
          }}
        />
        <NavList items={FOOTER_NAV} current={current} />
      </nav>
    </aside>
  );
}

type NavListProps = {
  items: NavItem[];
  current: NavItem | undefined;
  /** Where the links go instead of their own pages. */
  leadsTo?: string;
  /** Takes over the navigation of a link, by its address. */
  onNavigate?: (event: NavigateEvent, href: string) => void;
  /** The page whose link was clicked and is on its way. */
  pending?: string;
  /** The page that has something waiting for the operator: its link gets a dot. */
  flagged?: string;
  /** A number to show on a page's link, by its address, as written (`formatInboxCount`). None shows for zero. */
  counts?: Record<string, string>;
};

function NavList({ items, current, leadsTo, onNavigate, pending, flagged, counts }: NavListProps) {
  return (
    <ul className="flex flex-row flex-wrap gap-1 md:flex-col md:flex-nowrap">
      {items.map((item) => (
        <li key={item.href}>
          <NavLink
            item={item}
            active={item === current}
            leadsTo={leadsTo}
            onNavigate={onNavigate}
            pending={item.href === pending}
            flagged={item.href === flagged}
            count={counts?.[item.href]}
          />
        </li>
      ))}
    </ul>
  );
}

type NavLinkProps = {
  item: NavItem;
  active: boolean;
  leadsTo?: string;
  onNavigate?: NavListProps['onNavigate'];
  pending: boolean;
  flagged: boolean;
  count?: string;
};

function NavLink({ item, active, leadsTo, onNavigate, pending, flagged, count }: NavLinkProps) {
  const Icon = item.icon;
  const lit = active || pending;
  const className = cn(
    'flex h-8 items-center gap-2.5 rounded px-2 text-sm tracking-tight transition-colors motion-reduce:transition-none',
    lit ? 'bg-raised text-foreground' : 'text-secondary hover:bg-raised hover:text-foreground'
  );
  const content = (
    <>
      <Icon aria-hidden="true" className={cn('size-4 shrink-0', lit && 'text-accent')} />
      <span className="flex-1">{item.label}</span>
    </>
  );

  // Share feedback opens the operator's mail app, so it has no tab to open and no arrow.
  if (item.quiet) {
    return (
      <a href={item.href} className={className}>
        {content}
      </a>
    );
  }

  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer" className={className}>
        {content}
        <ArrowUpRight aria-hidden="true" className="size-3.5 text-muted" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }

  return (
    <Link
      href={leadsTo ?? item.href}
      onNavigate={onNavigate && ((event) => onNavigate(event, item.href))}
      aria-busy={pending || undefined}
      aria-current={active ? 'page' : undefined}
      className={className}
    >
      {content}
      {pending && (
        <>
          <span aria-hidden="true" className="size-1.5 shrink-0 animate-pulse rounded-full bg-accent" />
          <span className="sr-only">(opening)</span>
        </>
      )}
      {flagged && (
        <>
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
          <span className="sr-only">(setup not finished)</span>
        </>
      )}
      {count && count !== '0' && (
        <span className="rounded bg-accent/14 px-1.5 py-px font-mono text-[11px] leading-3.5 font-medium text-accent">
          {count}
          <span className="sr-only"> unread</span>
        </span>
      )}
    </Link>
  );
}

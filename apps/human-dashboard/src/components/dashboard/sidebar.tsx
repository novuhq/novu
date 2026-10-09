'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { DASHBOARD_HOME, FOOTER_NAV, findNavItem, MAIN_NAV, type NavItem } from '@/components/dashboard/nav';
import { Brand } from '@/components/site/brand';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type SidebarAgent = {
  name: string;
  /** The line under the name: "Not set up" before the first setup, then "Your agent". */
  status: string;
  /** Whether `human setup` has made the agent yet. Its picture sleeps until then. */
  setUp: boolean;
};

export function Sidebar({ agent }: { agent: SidebarAgent }) {
  const current = findNavItem(usePathname());

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 border-b border-border bg-subtle p-3 md:sticky md:top-0 md:h-dvh md:w-62 md:border-r md:border-b-0">
      <div className="flex h-8 items-center justify-between gap-2 px-1.5">
        <Brand href={DASHBOARD_HOME} />
        <Badge variant="accent">Beta</Badge>
      </div>

      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-2.5 py-[10.5px]">
        <AgentAvatar mood={agent.setUp ? 'idle' : 'asleep'} className="size-8 rounded-[9px]" />
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
        <NavList items={MAIN_NAV} current={current} />
        <NavList items={FOOTER_NAV} current={current} />
      </nav>
    </aside>
  );
}

function NavList({ items, current }: { items: NavItem[]; current: NavItem | undefined }) {
  return (
    <ul className="flex flex-row flex-wrap gap-1 md:flex-col md:flex-nowrap">
      {items.map((item) => (
        <li key={item.href}>
          <NavLink item={item} active={item === current} />
        </li>
      ))}
    </ul>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const className = cn(
    'flex h-8 items-center gap-2.5 rounded px-2 text-sm tracking-tight transition-colors motion-reduce:transition-none',
    active ? 'bg-raised text-foreground' : 'text-secondary hover:bg-raised hover:text-foreground'
  );
  const content = (
    <>
      <Icon aria-hidden="true" className={cn('size-4 shrink-0', active && 'text-accent')} />
      <span className="flex-1">{item.label}</span>
    </>
  );

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
    <Link href={item.href} aria-current={active ? 'page' : undefined} className={className}>
      {content}
    </Link>
  );
}

'use client';

import { ChevronDown, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ConnectAgentDrawer } from '@/components/connect/connect-agent-drawer';
import { CONFIGURE_CONNECT_PARAM } from '@/components/dashboard/nav';
import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { Fold } from '@/components/ui/stepper';
import { useNow } from '@/hooks/use-now';
import type { ToolId } from '@/lib/ai-tools';
import { type AgentHost, type ConnectApi, formatCheckedAgo, hostLiveness, hostName, isHostId } from '@/lib/host-status';
import type { HostId } from '@/lib/hosts';
import { HOST_LABELS } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

import {
  checkToolConnectedAction,
  createConnectCodeAction,
  readConnectCodeStatusAction,
  readHostStatusAction,
  readHostsAction,
} from './actions';
import { HostCheckPoll } from './host-check-poll';

/** What the connect drawers ask this page's server. */
const CONNECT_API: ConnectApi = {
  createCode: createConnectCodeAction,
  readCodeStatus: readConnectCodeStatusAction,
  readHosts: readHostStatusAction,
  isToolSignedIn: checkToolConnectedAction,
};

type AgentSetupProps = {
  /** The agent, as `connect` names it: its address before the `@`. */
  handle: string;
  /** The API the account lives on. */
  apiUrl: string;
  /**
   * When a host last checked the inbox, kept up to date while the page is open (`useLastHostCheck`). `null`
   * when none did, or when that couldn't be read: it then reads as not connected.
   */
  lastCheckedAt: string | null;
  /** Each host as the page rendered it, last checked first. Missing when they couldn't be read. */
  hosts?: AgentHost[];
  /** When the server rendered the page, so "2m ago" starts out as the server said it. */
  renderedAt: string;
  docsUrl: string;
  /** The hosted MCP server the chat apps connect to, or `null` while there is none. */
  mcpUrl: string | null;
  /** The chat apps that have signed in to the account. */
  connectedTools: ToolId[];
  /** The host a link asked for (`?connect=claude-code`): the page opens with the drawer on it. */
  connectHost?: HostId | null;
};

/** Stands in for hosts that couldn't be read, the same every render. */
const NO_HOSTS: AgentHost[] = [];

/** How often the host list is read on its own, as often as the last check is (`useLastHostCheck`). */
const HOSTS_POLL_MS = 60_000;

/**
 * The row for the agent behind the inbox (`Agent setup` in the design): whether a host reads its mail and
 * when one last checked, each host by name under it, and "Show setup", which opens "Connect another agent".
 * A host counts as connected while one checked the inbox within the last day; until one does, the page
 * reloads once it has.
 */
export function AgentSetup({
  lastCheckedAt,
  hosts: renderedHosts = NO_HOSTS,
  renderedAt,
  connectedTools,
  connectHost = null,
  ...drawer
}: AgentSetupProps) {
  const [open, setOpen] = useState(connectHost !== null);
  const now = useNow(renderedAt);
  const connected = hostLiveness(lastCheckedAt, now) === 'live';
  const hosts = useHosts(renderedHosts, lastCheckedAt);

  return (
    <section className="relative overflow-hidden rounded-[10px] border border-border bg-background">
      {!connected && <HostCheckPoll lastCheckedAt={lastCheckedAt} />}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border-strong bg-raised"
        >
          <Terminal className="size-3.5 text-foreground" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] leading-4.5 font-medium text-foreground">Agent setup</h2>
            {/* A new key when a host connects or stops checking, so its new status fades in. */}
            <span
              key={String(connected)}
              className={cn(
                'flex animate-overlay-in items-center gap-1.25 font-mono text-[11px] leading-3.5 motion-reduce:animate-none',
                connected ? 'text-secondary' : 'text-muted'
              )}
            >
              <span aria-hidden="true" className={cn('size-1.5 rounded-full', connected ? 'bg-success' : 'bg-muted')} />
              {connected ? 'connected' : 'not connected'}
            </span>
          </div>
          {/* The second line grows in once a host has checked the inbox. */}
          <Fold open={lastCheckedAt !== null}>
            <p className="truncate pt-0.5 text-xs leading-4 text-muted">
              {lastCheckedAt && `Last checked ${formatCheckedAgo(lastCheckedAt, now)}`}
            </p>
          </Fold>
        </div>
        <Button variant="quiet" className={SMALL_BUTTON} aria-haspopup="dialog" onClick={() => setOpen(true)}>
          <ChevronDown aria-hidden="true" className="size-3.5 text-foreground" />
          Show setup
        </Button>
      </div>
      {/* The hosts grow in under the row once the first one has come in. */}
      <Fold open={hosts.length > 0}>
        <ul aria-label="Hosts" className="border-t border-border">
          {hosts.map((host) => (
            <HostRow key={host.id ?? host.via} host={host} now={now} />
          ))}
        </ul>
      </Fold>
      <ConnectAgentDrawer
        {...drawer}
        connectedHosts={connectedTools}
        initialHost={connectHost ?? undefined}
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            forgetConnectParam();
          }
        }}
        api={CONNECT_API}
      />
    </section>
  );
}

/**
 * One host, lined up under the row's title: its name, the way it came in last, and when it last checked the
 * inbox, its dot green while that was within the last day. One that only used its code so far counts from
 * then. A host that comes in while the page is open rises in.
 */
function HostRow({ host, now }: { host: AgentHost; now: number }) {
  const live = hostLiveness(host.lastCheckedAt ?? host.connectedAt, now) === 'live';

  return (
    <li className="flex animate-rise-in items-center gap-2.5 border-b border-border py-2.5 pr-4 pl-14 last:border-b-0 motion-reduce:animate-none">
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 shrink-0 rounded-full transition-colors duration-300 motion-reduce:transition-none',
          live ? 'bg-success' : 'bg-muted'
        )}
      />
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-[13px] leading-4.5 text-foreground">{hostName(host)}</span>
        {/* Without a host's name the way it came in is its name already. */}
        {isHostId(host.id) && (
          <span className="shrink-0 rounded border border-border-strong px-1.5 py-px font-mono text-[10px] leading-3.5 text-secondary">
            {HOST_LABELS[host.via]}
          </span>
        )}
      </span>
      <span className="shrink-0 font-mono text-[11px] leading-3.5 text-muted">
        {host.lastCheckedAt ? `checked ${formatCheckedAgo(host.lastCheckedAt, now)}` : 'not checked yet'}
      </span>
    </li>
  );
}

/**
 * The hosts as the page rendered them, read again whenever the page learns of a check newer than any of
 * theirs: `useLastHostCheck` reads the last check once a minute, so each host's "checked 2m ago" stays as
 * true as the row's. A host that only used its code changes no check, so the list is also read on its own,
 * once a minute while the page is in view and when it comes back into view; a read that failed is tried
 * again then.
 */
function useHosts(rendered: AgentHost[], lastCheckedAt: string | null): AgentHost[] {
  const [hosts, setHosts] = useState(rendered);
  // A reload brings the server's list, which then counts from scratch.
  const [synced, setSynced] = useState(rendered);
  if (rendered !== synced) {
    setSynced(rendered);
    setHosts(rendered);
  }

  // ISO times in UTC compare as strings.
  const newest = hosts.reduce<string>(
    (latest, host) => ((host.lastCheckedAt ?? '') > latest ? (host.lastCheckedAt ?? '') : latest),
    ''
  );
  const behind = lastCheckedAt !== null && lastCheckedAt > newest ? lastCheckedAt : null;

  useEffect(() => {
    let stopped = false;

    const read = async () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      const latest = await readHostsAction().catch(() => null);
      if (!stopped && latest) {
        setHosts(latest);
      }
    };

    if (behind) {
      void read();
    }
    const interval = window.setInterval(read, HOSTS_POLL_MS);
    window.addEventListener('focus', read);
    document.addEventListener('visibilitychange', read);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', read);
      document.removeEventListener('visibilitychange', read);
    };
  }, [behind]);

  return hosts;
}

/** Takes `?connect=` off the address once the drawer is closed, so a reload doesn't open it again. */
function forgetConnectParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(CONFIGURE_CONNECT_PARAM)) {
    return;
  }

  url.searchParams.delete(CONFIGURE_CONNECT_PARAM);
  window.history.replaceState(null, '', url);
}

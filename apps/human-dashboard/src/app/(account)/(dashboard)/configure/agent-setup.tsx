'use client';

import { ChevronDown, Terminal } from 'lucide-react';
import { useState } from 'react';

import { ConnectAgentDrawer } from '@/components/connect/connect-agent-drawer';
import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { Fold } from '@/components/ui/stepper';
import { useNow } from '@/hooks/use-now';
import type { ToolId } from '@/lib/ai-tools';
import { type ConnectApi, formatCheckedAgo, type HostStatus, hostLiveness } from '@/lib/host-status';
import { cn } from '@/lib/utils';

import { checkToolConnectedAction, createConnectCodeAction, readHostStatusAction } from './actions';
import { HostCheckPoll } from './host-check-poll';

/** What the connect drawers ask this page's server. */
const CONNECT_API: ConnectApi = {
  createCode: createConnectCodeAction,
  readHosts: readHostStatusAction,
  isToolSignedIn: checkToolConnectedAction,
};

type AgentSetupProps = {
  /** The agent, as `connect` names it: its address before the `@`. */
  handle: string;
  /** The agent's address, or `null` while it has none. */
  address: string | null;
  /** The API the account lives on. */
  apiUrl: string;
  /** Whether a host reads the agent's mail, or `null` when that couldn't be read: it then reads as not connected. */
  hostStatus: HostStatus | null;
  /** When the server rendered the page, so "2m ago" starts out as the server said it. */
  renderedAt: string;
  docsUrl: string;
  /** The hosted MCP server the chat apps connect to, or `null` while there is none. */
  mcpUrl: string | null;
  /** The chat apps that have signed in to the account. */
  connectedTools: ToolId[];
};

/**
 * The row for the agent behind the inbox (`Agent setup` in the design): whether a host reads its mail and
 * when one last checked, and "Show setup", which opens "Connect another agent". A host counts as
 * connected while one checked the inbox within the last day; until one does, the page reloads once it has.
 */
export function AgentSetup({ hostStatus, renderedAt, ...drawer }: AgentSetupProps) {
  const [open, setOpen] = useState(false);
  const now = useNow(renderedAt);
  const lastCheckedAt = hostStatus?.lastCheckedAt ?? null;
  const connected = hostLiveness(lastCheckedAt, now) === 'live';

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
      <ConnectAgentDrawer {...drawer} open={open} onOpenChange={setOpen} api={CONNECT_API} />
    </section>
  );
}

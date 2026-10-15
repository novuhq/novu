'use client';

import { useNow } from '@/hooks/use-now';
import { formatCheckedAgo, hostLiveness } from '@/lib/host-status';
import { cn } from '@/lib/utils';

import { HostCheckPoll } from '../configure/host-check-poll';

type HostCheckProps = {
  /** When a host last checked the inbox, or `null` if none ever did. */
  lastCheckedAt: string | null;
  /** When the server rendered the page, so "2m ago" starts out as the server said it. */
  renderedAt: string;
};

/**
 * The header's word on the agent's host (`Agent checked` in the design): "agent checked 2m ago" in green
 * while a host checked within the last day, and "no agent connected" in grey otherwise. While none counts
 * as connected, the page reloads once one checks the inbox.
 */
export function HostCheck({ lastCheckedAt, renderedAt }: HostCheckProps) {
  const now = useNow(renderedAt);
  const connected = hostLiveness(lastCheckedAt, now) === 'live';

  return (
    <>
      {!connected && <HostCheckPoll lastCheckedAt={lastCheckedAt} />}
      {/* A new key when a host connects or stops checking, so the new words fade in. */}
      <p
        key={String(connected)}
        className={cn(
          'flex shrink-0 animate-overlay-in items-center gap-1.5 font-mono text-[11px] leading-4 motion-reduce:animate-none',
          connected ? 'text-secondary' : 'text-muted'
        )}
      >
        <span aria-hidden="true" className={cn('size-1.5 rounded-full', connected ? 'bg-success' : 'bg-muted')} />
        {connected && lastCheckedAt ? `agent checked ${formatCheckedAgo(lastCheckedAt, now)}` : 'no agent connected'}
      </p>
    </>
  );
}

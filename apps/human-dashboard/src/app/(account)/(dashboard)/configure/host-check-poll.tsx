'use client';

import { StatusPoll } from '@/components/ui/status-poll';
import { NEVER_CHECKED } from '@/lib/host-status';

import { readHostCheckAction } from './actions';

/** How often a page asks whether a host checked the inbox, while none counts as connected. */
const HOST_POLL_MS = 10_000;

/**
 * Keeps a page in step with the agent's host while none counts as connected: the page reloads once a host
 * checks the inbox, and its status then moves on to "connected". Renders nothing.
 */
export function HostCheckPoll({ lastCheckedAt }: { lastCheckedAt: string | null }) {
  return <StatusPoll status={lastCheckedAt ?? NEVER_CHECKED} read={readHostCheckAction} everyMs={HOST_POLL_MS} />;
}

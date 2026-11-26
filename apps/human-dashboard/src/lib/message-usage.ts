const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Share of a window used from which its meter turns to the warning colour. */
export const NEARLY_USED_UP = 0.8;

/** One window of the account's message limit: a UTC day or a UTC month. */
export type MessageWindow = { used: number; limit: number; resetsAt: string };

/**
 * How many messages the account's agents sent to people today and this month, out of how many they may. A window
 * is `null` where nothing is counted, as on a self-hosted Agent Inbox.
 */
export type MessageUsage = { daily: MessageWindow | null; monthly: MessageWindow | null };

export type MessageCap = 'daily' | 'monthly';

/** The window as it stands at `now`: once it started over, none of it is used. */
export function asOf(window: MessageWindow, now: number): MessageWindow {
  return now >= Date.parse(window.resetsAt) ? { ...window, used: 0 } : window;
}

/** The window whose messages are all used: the month's first, as it lasts longer. `null` while both have some left. */
export function usedUpWindow(usage: MessageUsage, now: number): { cap: MessageCap; window: MessageWindow } | null {
  for (const cap of ['monthly', 'daily'] as const) {
    const window = usage[cap];
    if (window && asOf(window, now).used >= window.limit) {
      return { cap, window };
    }
  }

  return null;
}

/** "in 40 minutes", "in about 6 hours", "in about 11 days". */
export function fromNow(iso: string, now: number): string {
  const ms = Math.max(0, Date.parse(iso) - now);
  const minutes = Math.max(1, Math.ceil(ms / MINUTE_MS));
  if (minutes < 60) {
    return `in ${count(minutes, 'minute')}`;
  }

  const hours = Math.round(ms / HOUR_MS);
  if (hours < 48) {
    return `in about ${count(hours, 'hour')}`;
  }

  return `in about ${count(Math.round(ms / DAY_MS), 'day')}`;
}

function count(amount: number, unit: string): string {
  return `${amount} ${unit}${amount === 1 ? '' : 's'}`;
}

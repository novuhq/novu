import type { SubscriberSessionClientStats, SubscriberSessionStats } from '@/api/environments';

/** At or above this share of signed-token logins, the rest is a long tail rather than a migration in progress. */
const ALMOST_READY_SHARE = 0.99;
const RARELY_USED_AFTER_DAYS = 7;

export const WINDOW_DAYS = [7, 30] as const;
export type WindowDays = (typeof WINDOW_DAYS)[number];
export const DEFAULT_WINDOW_DAYS: WindowDays = 30;

export type ReadinessStatus = 'on' | 'noLogins' | 'ready' | 'almostReady' | 'inProgress';

export type Readiness = {
  status: ReadinessStatus;
  days: number;
  tokenLogins: number;
  withoutTokenLogins: number;
  /** Share of logins that used a signed token, 0 to 1. */
  tokenShare: number;
  clients: SubscriberSessionClientStats[];
  clientsWithoutToken: SubscriberSessionClientStats[];
};

export function readinessOf(stats: SubscriberSessionStats, required: boolean): Readiness {
  const tokenLogins = sum(stats.clients, (row) => row.token);
  const withoutTokenLogins = sum(stats.clients, (row) => row.withoutToken);
  const total = tokenLogins + withoutTokenLogins;
  const tokenShare = total ? tokenLogins / total : 0;

  return {
    status: statusOf({ required, total, withoutTokenLogins, tokenShare }),
    days: stats.days,
    tokenLogins,
    withoutTokenLogins,
    tokenShare,
    clients: stats.clients,
    clientsWithoutToken: stats.clients.filter((row) => row.withoutToken > 0),
  };
}

function statusOf({
  required,
  total,
  withoutTokenLogins,
  tokenShare,
}: {
  required: boolean;
  total: number;
  withoutTokenLogins: number;
  tokenShare: number;
}): ReadinessStatus {
  if (required) return 'on';
  if (!total) return 'noLogins';
  if (!withoutTokenLogins) return 'ready';

  return tokenShare >= ALMOST_READY_SHARE ? 'almostReady' : 'inProgress';
}

export const STATUS_LABEL: Record<ReadinessStatus, string> = {
  on: 'On',
  noLogins: 'No logins yet',
  ready: 'Ready',
  almostReady: 'Almost ready',
  inProgress: 'In progress',
};

export const STATUS_TONE: Record<ReadinessStatus, 'completed' | 'pending' | 'disabled'> = {
  on: 'completed',
  ready: 'completed',
  almostReady: 'pending',
  inProgress: 'pending',
  noLogins: 'disabled',
};

export function describeStatus(readiness: Readiness, environmentName: string): string {
  const { status, days } = readiness;
  const clients = clientCount(readiness.clientsWithoutToken.length);

  switch (status) {
    case 'on':
      return `Only signed subscriber tokens are accepted in ${environmentName}. You can turn this off at any time.`;
    case 'noLogins':
      return `No Inbox logins in the last ${days} days.`;
    case 'ready':
      return `All Inbox logins in the last ${days} days used a signed token.`;
    case 'almostReady':
      return `${formatShare(readiness.tokenShare)}% of logins used a signed token. ${clients} still ${readiness.clientsWithoutToken.length > 1 ? 'log' : 'logs'} in without one.`;
    case 'inProgress':
      return `${formatShare(readiness.tokenShare)}% of logins used a signed token. Update ${clients} to finish.`;
  }
}

/** The confirm dialog's lead sentence; the clients that can't log in are listed under it. */
export function describeTurnOn(readiness: Readiness): string {
  const { days } = readiness;
  if (!readiness.tokenLogins && !readiness.withoutTokenLogins) {
    return `There were no Inbox logins in the last ${days} days, so nothing to check yet.`;
  }
  if (!readiness.withoutTokenLogins) {
    return `Every Inbox login in the last ${days} days used a signed token.`;
  }

  return `${formatShare(readiness.tokenShare)}% of logins in the last ${days} days used a signed token. These clients can't log in until they're updated:`;
}

export function viewClientsLabel(readiness: Readiness): string {
  const count = readiness.clientsWithoutToken.length;

  return count && readiness.status !== 'on' ? `View ${clientCount(count)}` : 'View logins';
}

export function isRarelyUsed(row: SubscriberSessionClientStats): boolean {
  return (row.lastSeenWithoutTokenDaysAgo ?? 0) >= RARELY_USED_AFTER_DAYS;
}

export function formatLastSeen(daysAgo: number): string {
  if (daysAgo === 0) return 'today';
  if (daysAgo === 1) return 'yesterday';

  return `${daysAgo} days ago`;
}

/** Rounds down, so a share just under 100% never reads as 100%. */
export function formatShare(share: number): string {
  return (Math.floor(share * 1000) / 10).toFixed(1).replace(/\.0$/, '');
}

function clientCount(count: number): string {
  return `${count} client${count === 1 ? '' : 's'}`;
}

function sum<T>(rows: T[], value: (row: T) => number): number {
  return rows.reduce((total, row) => total + value(row), 0);
}

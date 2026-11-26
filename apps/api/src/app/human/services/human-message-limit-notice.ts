import type { UsedUpWindow } from './human-message-quota.service';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const MONTH_DAY = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });

/**
 * What the operator gets when the account runs out of messages: which limit, until when the agent can't write to
 * anyone, and that messages to it still come in. The windows are UTC days and months, so the time is UTC too, with
 * how far off it is for anyone elsewhere.
 */
export function limitReachedNotice(agentName: string, usedUp: UsedUpWindow, now: Date): string {
  const resetsAt = new Date(usedUp.resetsAt);
  const daily = usedUp.cap === 'daily';
  const window = daily ? 'today’s' : 'this month’s';
  const until = daily ? '00:00 UTC' : `${MONTH_DAY.format(resetsAt)}, 00:00 UTC`;

  return (
    `${agentName} reached ${window} limit of ${usedUp.limit} messages, so its replies to you and your contacts ` +
    `won’t arrive until ${until}, ${fromNow(resetsAt, now)}. Messages to ${agentName} still come in.`
  );
}

/** "in 40 minutes", "in about 6 hours", "in about 11 days". */
export function fromNow(when: Date, now: Date): string {
  const ms = Math.max(0, when.getTime() - now.getTime());
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

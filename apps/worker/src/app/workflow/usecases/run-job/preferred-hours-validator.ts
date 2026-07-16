import {
  ChannelTypeEnum,
  PreferredHours,
  PreferredHoursChannelPolicy,
  STEP_TYPE_TO_CHANNEL_TYPE,
  StepTypeEnum,
} from '@novu/shared';
import { addDays, isAfter, set } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

const VALID_CHANNEL_KEYS = new Set<string>(Object.values(ChannelTypeEnum));
const VALID_POLICIES = new Set<PreferredHoursChannelPolicy>(['respect', 'always']);

/**
 * Returns true when preferredHours is unset/invalid (no restriction) or when
 * the current time falls inside the subscriber's preferred daily window.
 * Does not consider channel overrides — use `shouldApplyPreferredHoursGate` /
 * `isPreferredHoursDeliveryAllowed` for channel-aware decisions.
 */
export function isWithinPreferredHours(
  preferredHours?: PreferredHours | null,
  currentTime: Date = new Date(),
  timezone?: string
): boolean {
  if (!isValidPreferredHours(preferredHours)) {
    return true;
  }

  const local = timezone ? utcToZonedTime(currentTime, timezone) : currentTime;
  const minutes = getMinutesSinceMidnight(local, !!timezone);
  const start = parseHhMmToMinutes(preferredHours.start);
  const end = parseHhMmToMinutes(preferredHours.end);

  if (start === end) {
    // Degenerate window (zero length) — treat as no restriction rather than blocking forever.
    return true;
  }

  if (end < start) {
    // Overnight: e.g. 22:00–06:00
    return minutes >= start || minutes <= end;
  }

  return minutes >= start && minutes <= end;
}

/**
 * Whether preferred-hours gating applies to this channel.
 * Channels with policy `always` interrupt (bypass the window).
 * Unset channels default to `respect`.
 */
export function shouldApplyPreferredHoursGate(
  preferredHours?: PreferredHours | null,
  channelOrStep?: ChannelTypeEnum | StepTypeEnum | string | null
): boolean {
  if (!isValidPreferredHours(preferredHours)) {
    return false;
  }

  const channel = resolveChannelType(channelOrStep);
  if (!channel) {
    // Unknown / non-delivery step — still apply window if we got here
    return true;
  }

  return getChannelPreferredHoursPolicy(preferredHours, channel) !== 'always';
}

/**
 * True when delivery may proceed now for the given channel:
 * - no preferredHours restriction, or
 * - channel is set to always interrupt, or
 * - current time is inside the preferred window
 */
export function isPreferredHoursDeliveryAllowed(
  preferredHours?: PreferredHours | null,
  channelOrStep?: ChannelTypeEnum | StepTypeEnum | string | null,
  currentTime: Date = new Date(),
  timezone?: string
): boolean {
  if (!shouldApplyPreferredHoursGate(preferredHours, channelOrStep)) {
    return true;
  }

  return isWithinPreferredHours(preferredHours, currentTime, timezone);
}

export function getChannelPreferredHoursPolicy(
  preferredHours: PreferredHours,
  channel: ChannelTypeEnum
): PreferredHoursChannelPolicy {
  const override = preferredHours.channelOverrides?.[channel];
  if (override === 'always' || override === 'respect') {
    return override;
  }

  return 'respect';
}

export function resolveChannelType(
  channelOrStep?: ChannelTypeEnum | StepTypeEnum | string | null
): ChannelTypeEnum | undefined {
  if (!channelOrStep) {
    return undefined;
  }

  if (VALID_CHANNEL_KEYS.has(channelOrStep)) {
    return channelOrStep as ChannelTypeEnum;
  }

  return STEP_TYPE_TO_CHANNEL_TYPE.get(channelOrStep);
}

/**
 * Next UTC instant when the preferred window opens.
 * Returns `nowUtc` when there is no restriction or the window is currently open.
 */
export function calculateNextPreferredHoursTime(
  preferredHours?: PreferredHours | null,
  nowUtc: Date = new Date(),
  timezone?: string
): Date {
  if (!isValidPreferredHours(preferredHours)) {
    return nowUtc;
  }

  if (isWithinPreferredHours(preferredHours, nowUtc, timezone)) {
    return nowUtc;
  }

  const localNow = timezone ? utcToZonedTime(nowUtc, timezone) : nowUtc;
  const startParts = parseHhMm(preferredHours.start);
  const endParts = parseHhMm(preferredHours.end);
  const startMinutes = startParts.hours * 60 + startParts.minutes;
  const endMinutes = endParts.hours * 60 + endParts.minutes;
  const nowMinutes = getMinutesSinceMidnight(localNow, !!timezone);

  let candidateLocal: Date;

  if (endMinutes < startMinutes) {
    // Overnight window: outside means between end and start on the same calendar day.
    // Next open is today's start if we're after end and before start, which is the only outside case.
    if (nowMinutes > endMinutes && nowMinutes < startMinutes) {
      candidateLocal = setLocalTime(localNow, startParts, !!timezone);
    } else {
      // Should not happen if isWithin returned false, but fall back to next day start.
      candidateLocal = setLocalTime(addDays(localNow, 1), startParts, !!timezone);
    }
  } else if (nowMinutes < startMinutes) {
    // Before today's window
    candidateLocal = setLocalTime(localNow, startParts, !!timezone);
  } else {
    // After today's window — open tomorrow at start
    candidateLocal = setLocalTime(addDays(localNow, 1), startParts, !!timezone);
  }

  // Ensure candidate is strictly in the future (guards ms/clock edge cases)
  if (!isAfter(candidateLocal, localNow)) {
    candidateLocal = setLocalTime(addDays(localNow, 1), startParts, !!timezone);
  }

  if (timezone) {
    return zonedTimeToUtc(candidateLocal, timezone);
  }

  return new Date(
    Date.UTC(
      candidateLocal.getUTCFullYear(),
      candidateLocal.getUTCMonth(),
      candidateLocal.getUTCDate(),
      candidateLocal.getUTCHours(),
      candidateLocal.getUTCMinutes(),
      0,
      0
    )
  );
}

export function isValidPreferredHours(preferredHours?: PreferredHours | null): preferredHours is PreferredHours {
  if (!preferredHours || typeof preferredHours !== 'object') {
    return false;
  }

  if (typeof preferredHours.start !== 'string' || typeof preferredHours.end !== 'string') {
    return false;
  }

  if (!HH_MM.test(preferredHours.start) || !HH_MM.test(preferredHours.end)) {
    return false;
  }

  if (preferredHours.channelOverrides !== undefined) {
    if (!isValidChannelOverrides(preferredHours.channelOverrides)) {
      return false;
    }
  }

  return true;
}

export function isValidChannelOverrides(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  for (const [key, policy] of Object.entries(value as Record<string, unknown>)) {
    if (!VALID_CHANNEL_KEYS.has(key)) {
      return false;
    }
    if (!VALID_POLICIES.has(policy as PreferredHoursChannelPolicy)) {
      return false;
    }
  }

  return true;
}

function parseHhMm(value: string): { hours: number; minutes: number } {
  const match = HH_MM.exec(value);
  if (!match) {
    return { hours: 0, minutes: 0 };
  }

  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function parseHhMmToMinutes(value: string): number {
  const { hours, minutes } = parseHhMm(value);

  return hours * 60 + minutes;
}

function getMinutesSinceMidnight(date: Date, hasTimezone: boolean): number {
  const hours = hasTimezone ? date.getHours() : date.getUTCHours();
  const minutes = hasTimezone ? date.getMinutes() : date.getUTCMinutes();

  return hours * 60 + minutes;
}

function setLocalTime(
  day: Date,
  time: { hours: number; minutes: number },
  hasTimezone: boolean
): Date {
  if (hasTimezone) {
    return set(day, {
      hours: time.hours,
      minutes: time.minutes,
      seconds: 0,
      milliseconds: 0,
    });
  }

  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), time.hours, time.minutes, 0, 0));
}

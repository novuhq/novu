import { ApiServiceLevelEnum, FeatureNameEnum, type GetSubscriptionDto, getFeatureForTierAsNumber } from '@novu/shared';
import { startOfDay, startOfMonth, startOfYear, subDays, subMonths } from 'date-fns';
import { IS_SELF_HOSTED } from '../config';

type OrganizationLike = { createdAt: Date };

export const DEFAULT_ACTIVITY_FEED_RANGE = 'today';

export const ACTIVITY_DATE_RANGE_OPTIONS = [
  { value: DEFAULT_ACTIVITY_FEED_RANGE, label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '3M', label: 'Last 3 months' },
  { value: '12M', label: 'Last 12 months' },
  { value: 'mtd', label: 'Month to date' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time' },
] as const;

export type ActivityDateRangePreset = (typeof ACTIVITY_DATE_RANGE_OPTIONS)[number]['value'];

export type ActivityDateRange =
  | { kind: 'preset'; preset: ActivityDateRangePreset }
  | { kind: 'custom'; after: string; before: string };

export type ResolvedActivityDateRange = {
  after?: string;
  before?: string;
};

export function parseActivityTransactionIds(value: string): string[] {
  return value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export function areActivityDateRangesEqual(left: ActivityDateRange, right: ActivityDateRange): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === 'preset' && right.kind === 'preset') {
    return left.preset === right.preset;
  }

  return (
    left.kind === 'custom' && right.kind === 'custom' && left.after === right.after && left.before === right.before
  );
}

type ActivityRetentionPolicy = { kind: 'unlimited' } | { kind: 'limited'; durationMs: number };

function getActivityRetentionPolicy({
  organization,
  apiServiceLevel,
}: {
  organization: OrganizationLike;
  apiServiceLevel?: ApiServiceLevelEnum;
}): ActivityRetentionPolicy {
  if (IS_SELF_HOSTED) {
    return { kind: 'unlimited' };
  }

  const isLegacyFreeTier =
    apiServiceLevel === ApiServiceLevelEnum.FREE && organization.createdAt < new Date('2025-02-28');

  if (isLegacyFreeTier) {
    return { kind: 'limited', durationMs: 30 * 24 * 60 * 60 * 1000 };
  }

  return {
    kind: 'limited',
    durationMs: getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
      apiServiceLevel || ApiServiceLevelEnum.FREE,
      true
    ),
  };
}

export function getActivityFeedRetentionStart({
  organization,
  apiServiceLevel,
  now = new Date(),
}: {
  organization: OrganizationLike;
  apiServiceLevel?: ApiServiceLevelEnum;
  now?: Date;
}) {
  const policy = getActivityRetentionPolicy({ organization, apiServiceLevel });

  return policy.kind === 'unlimited' ? undefined : new Date(now.getTime() - policy.durationMs);
}

export function parseActivityDateRange(value?: string, after?: string, before?: string): ActivityDateRange {
  if (value === 'custom' && after && before) {
    return { kind: 'custom', after, before };
  }

  const preset = value === '24h' ? DEFAULT_ACTIVITY_FEED_RANGE : value === '90d' ? '3M' : value;
  const option = ACTIVITY_DATE_RANGE_OPTIONS.find((candidate) => candidate.value === preset);

  return { kind: 'preset', preset: option?.value ?? DEFAULT_ACTIVITY_FEED_RANGE };
}

export function resolveActivityDateRange(
  dateRange: ActivityDateRange = { kind: 'preset', preset: DEFAULT_ACTIVITY_FEED_RANGE },
  now = new Date()
): ResolvedActivityDateRange {
  if (dateRange.kind === 'custom') {
    return { after: dateRange.after, before: dateRange.before };
  }

  switch (dateRange.preset) {
    case 'today':
      return { after: startOfDay(now).toISOString(), before: now.toISOString() };
    case '7d':
      return { after: subDays(now, 7).toISOString(), before: now.toISOString() };
    case '30d':
      return { after: subDays(now, 30).toISOString(), before: now.toISOString() };
    case '3M':
      return { after: subDays(now, 90).toISOString(), before: now.toISOString() };
    case '12M':
      return { after: subMonths(now, 12).toISOString(), before: now.toISOString() };
    case 'mtd':
      return { after: startOfMonth(now).toISOString(), before: now.toISOString() };
    case 'ytd':
      return { after: startOfYear(now).toISOString(), before: now.toISOString() };
    case 'all':
      return {};
    default: {
      const exhaustivePreset: never = dateRange.preset;

      throw new Error(`Unsupported activity date range: ${exhaustivePreset}`);
    }
  }
}

export function buildActivityDateFilters({
  organization,
  apiServiceLevel,
  now = new Date(),
}: {
  organization: OrganizationLike;
  apiServiceLevel?: ApiServiceLevelEnum;
  now?: Date;
}) {
  const policy = getActivityRetentionPolicy({ organization, apiServiceLevel });
  const retentionStart = policy.kind === 'limited' ? now.getTime() - policy.durationMs : undefined;

  return ACTIVITY_DATE_RANGE_OPTIONS.map((option) => {
    const resolvedRange = resolveActivityDateRange({ kind: 'preset', preset: option.value }, now);
    const startsBeforeRetention =
      retentionStart !== undefined && resolvedRange.after
        ? new Date(resolvedRange.after).getTime() < retentionStart
        : false;

    return {
      disabled: policy.kind === 'limited' && (option.value === 'all' || startsBeforeRetention),
      label: option.label,
      value: option.value,
    };
  });
}

export function getMaxAvailableActivityFeedDateRange({
  subscription,
  organization,
}: Partial<{
  subscription: GetSubscriptionDto | null;
  organization: OrganizationLike | null;
}>) {
  if (!organization || !subscription) {
    return DEFAULT_ACTIVITY_FEED_RANGE;
  }

  const now = new Date();
  const lastAvailableActivityFeedFilter = buildActivityDateFilters({
    organization,
    apiServiceLevel: subscription.apiServiceLevel,
    now,
  })
    .filter((option) => !option.disabled)
    .sort((left, right) => {
      const leftAfter = resolveActivityDateRange({ kind: 'preset', preset: left.value }, now).after;
      const rightAfter = resolveActivityDateRange({ kind: 'preset', preset: right.value }, now).after;
      const leftSpan = leftAfter ? now.getTime() - new Date(leftAfter).getTime() : Number.POSITIVE_INFINITY;
      const rightSpan = rightAfter ? now.getTime() - new Date(rightAfter).getTime() : Number.POSITIVE_INFINITY;

      return leftSpan - rightSpan;
    })
    .at(-1);

  return lastAvailableActivityFeedFilter?.value ?? DEFAULT_ACTIVITY_FEED_RANGE;
}

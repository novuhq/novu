import { ApiServiceLevelEnum, FeatureNameEnum, type GetSubscriptionDto, getFeatureForTierAsNumber } from '@novu/shared';
import { startOfDay, startOfMonth, startOfYear, subDays, subMonths } from 'date-fns';
import { IS_SELF_HOSTED } from '../config';

type OrganizationLike = { createdAt: Date };

export const DEFAULT_ACTIVITY_FEED_RANGE = 'today';

export const ACTIVITY_DATE_RANGE_OPTIONS = [
  { value: DEFAULT_ACTIVITY_FEED_RANGE, label: 'Today', ms: 24 * 60 * 60 * 1000 },
  { value: '7d', label: 'Last 7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { value: '30d', label: 'Last 30 days', ms: 30 * 24 * 60 * 60 * 1000 },
  { value: '3M', label: 'Last 3 months', ms: 90 * 24 * 60 * 60 * 1000 },
  { value: '12M', label: 'Last 12 months', ms: 365 * 24 * 60 * 60 * 1000 },
  { value: 'mtd', label: 'Month to date', ms: 31 * 24 * 60 * 60 * 1000 },
  { value: 'ytd', label: 'Year to date', ms: 366 * 24 * 60 * 60 * 1000 },
  { value: 'all', label: 'All time', ms: Number.POSITIVE_INFINITY },
] as const;

export type ActivityDateRangePreset = (typeof ACTIVITY_DATE_RANGE_OPTIONS)[number]['value'];

export type ResolvedActivityDateRange = {
  after?: string;
  before?: string;
};

function getMaxRetentionMs({
  organization,
  apiServiceLevel,
}: {
  organization: OrganizationLike;
  apiServiceLevel?: ApiServiceLevelEnum;
}) {
  const isLegacyFreeTier =
    apiServiceLevel === ApiServiceLevelEnum.FREE && organization.createdAt < new Date('2025-02-28');

  if (isLegacyFreeTier) {
    return 30 * 24 * 60 * 60 * 1000;
  }

  return getFeatureForTierAsNumber(
    FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
    IS_SELF_HOSTED ? ApiServiceLevelEnum.UNLIMITED : apiServiceLevel || ApiServiceLevelEnum.FREE,
    true
  );
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
  const maxRetentionMs = getMaxRetentionMs({ organization, apiServiceLevel });

  return maxRetentionMs === Number.MAX_SAFE_INTEGER ? undefined : new Date(now.getTime() - maxRetentionMs);
}

export function resolveActivityDateRange(
  dateRange?: string,
  customAfter?: string,
  customBefore?: string,
  now = new Date()
): ResolvedActivityDateRange {
  if (dateRange === 'custom') {
    return {
      after: customAfter,
      before: customBefore,
    };
  }

  switch (dateRange || DEFAULT_ACTIVITY_FEED_RANGE) {
    case 'today':
      return { after: startOfDay(now).toISOString(), before: now.toISOString() };
    case '7d':
      return { after: subDays(now, 7).toISOString(), before: now.toISOString() };
    case '30d':
      return { after: subDays(now, 30).toISOString(), before: now.toISOString() };
    case '3M':
    case '90d':
      return { after: subMonths(now, 3).toISOString(), before: now.toISOString() };
    case '12M':
      return { after: subMonths(now, 12).toISOString(), before: now.toISOString() };
    case 'mtd':
      return { after: startOfMonth(now).toISOString(), before: now.toISOString() };
    case 'ytd':
      return { after: startOfYear(now).toISOString(), before: now.toISOString() };
    case 'all':
      return {};
    case '24h':
      return { after: subDays(now, 1).toISOString(), before: now.toISOString() };
    default:
      return { after: startOfDay(now).toISOString(), before: now.toISOString() };
  }
}

export function buildActivityDateFilters({
  organization,
  apiServiceLevel,
}: {
  organization: OrganizationLike;
  apiServiceLevel?: ApiServiceLevelEnum;
}) {
  const maxRetentionMs = getMaxRetentionMs({ organization, apiServiceLevel });

  return ACTIVITY_DATE_RANGE_OPTIONS.map((option) => {
    return {
      disabled: option.value === 'all' ? maxRetentionMs !== Number.MAX_SAFE_INTEGER : option.ms > maxRetentionMs,
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

  const lastAvailableActivityFeedFilter = buildActivityDateFilters({
    organization,
    apiServiceLevel: subscription.apiServiceLevel,
  })
    .filter((option) => !option.disabled)
    .sort((left, right) => {
      const leftMs = ACTIVITY_DATE_RANGE_OPTIONS.find((option) => option.value === left.value)?.ms ?? 0;
      const rightMs = ACTIVITY_DATE_RANGE_OPTIONS.find((option) => option.value === right.value)?.ms ?? 0;

      return leftMs - rightMs;
    })
    .at(-1);

  return lastAvailableActivityFeedFilter?.value ?? DEFAULT_ACTIVITY_FEED_RANGE;
}

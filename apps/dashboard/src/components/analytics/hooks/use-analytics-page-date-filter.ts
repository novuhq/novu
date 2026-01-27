import {
  ApiServiceLevelEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  type GetSubscriptionDto,
  getFeatureForTierAsNumber,
} from '@novu/shared';
import { useEffect, useMemo, useState } from 'react';
import { IS_SELF_HOSTED } from '../../../config';
import { useNumericFeatureFlag } from '../../../hooks/use-feature-flag';

type OrganizationLike = { createdAt: Date };

export type DateRangeOption = {
  value: string;
  label: string;
  ms: number;
};

export type DateFilterOption = {
  disabled: boolean;
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabledDueToAnalyticsLimit?: boolean;
};

const HOME_PAGE_DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: '24h', label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000 },
  { value: '7d', label: 'Last 7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { value: '30d', label: 'Last 30 days', ms: 30 * 24 * 60 * 60 * 1000 },
  { value: '90d', label: 'Last 90 days', ms: 90 * 24 * 60 * 60 * 1000 },
];

function buildDateFilterOptions({
  organization,
  apiServiceLevel,
  maxDateAnalyticsMs,
}: {
  organization: OrganizationLike;
  apiServiceLevel?: ApiServiceLevelEnum;
  maxDateAnalyticsMs?: number;
}): Omit<DateFilterOption, 'icon'>[] {
  const maxActivityFeedRetentionMs = getFeatureForTierAsNumber(
    FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
    IS_SELF_HOSTED ? ApiServiceLevelEnum.UNLIMITED : apiServiceLevel || ApiServiceLevelEnum.FREE,
    true
  );

  return HOME_PAGE_DATE_RANGE_OPTIONS.map((option) => {
    const isLegacyFreeTier =
      apiServiceLevel === ApiServiceLevelEnum.FREE && organization && organization.createdAt < new Date('2025-02-28');

    const legacyFreeMaxRetentionMs = 30 * 24 * 60 * 60 * 1000;
    const maxRetentionMs = isLegacyFreeTier ? legacyFreeMaxRetentionMs : maxActivityFeedRetentionMs;

    // Check if the option exceeds the analytics date limit
    const exceedsAnalyticsLimit = Boolean(
      maxDateAnalyticsMs && maxDateAnalyticsMs > 0 && option.ms > maxDateAnalyticsMs
    );
    const exceedsRetentionLimit = option.ms > maxRetentionMs;

    return {
      disabled: exceedsRetentionLimit || exceedsAnalyticsLimit,
      label: exceedsAnalyticsLimit && !exceedsRetentionLimit ? `${option.label} (Coming soon)` : option.label,
      value: option.value,
      disabledDueToAnalyticsLimit: exceedsAnalyticsLimit && !exceedsRetentionLimit,
    };
  });
}

function getDefaultDateRange({
  subscription,
  organization,
  maxDateAnalyticsMs,
}: {
  subscription: GetSubscriptionDto | null | undefined;
  organization: OrganizationLike | null | undefined;
  maxDateAnalyticsMs?: number;
}): string {
  if (!organization || !subscription) {
    return '30d';
  }

  const availableFilters = buildDateFilterOptions({
    organization,
    apiServiceLevel: subscription.apiServiceLevel,
    maxDateAnalyticsMs,
  });

  // Find the maximum available date range up to 30 days, excluding "Coming soon" options
  // Priority order: 30d -> 7d -> 24h (largest available that's not "Coming soon")
  const preferredOrder = ['30d', '7d', '24h'];

  for (const preferredValue of preferredOrder) {
    const option = availableFilters.find((opt) => opt.value === preferredValue);
    if (option && !option.disabled && !option.disabledDueToAnalyticsLimit) {
      return preferredValue;
    }
  }

  // Fallback: find any available option that's not "Coming soon"
  const fallbackOption = availableFilters.find((option) => !option.disabled && !option.disabledDueToAnalyticsLimit);
  if (fallbackOption) {
    return fallbackOption.value;
  }

  // Last resort: find any available option (including subscription-limited ones)
  const lastResortOption = availableFilters.find((option) => !option.disabled);
  return lastResortOption?.value ?? '7d';
}

function getChartsDateRange(selectedDateRange: string) {
  const rangeMs =
    HOME_PAGE_DATE_RANGE_OPTIONS.find((option) => option.value === selectedDateRange)?.ms ?? 30 * 24 * 60 * 60 * 1000;

  return {
    createdAtGte: new Date(Date.now() - rangeMs).toISOString(),
  };
}

type UseHomepageDateFilterParams = {
  organization: OrganizationLike | null | undefined;
  subscription: GetSubscriptionDto | null | undefined;
  upgradeCtaIcon?: React.ComponentType<{ className?: string }>;
};

export function useHomepageDateFilter({ organization, subscription, upgradeCtaIcon }: UseHomepageDateFilterParams) {
  // Get the max date analytics feature flag value (in days, convert to milliseconds)
  // This feature flag controls the maximum date range available for analytics
  // If set to 7, only options <= 7 days will be enabled, others will show "Coming soon"
  // Controlled via LaunchDarkly feature flag: MAX_DATE_ANALYTICS_ENABLED_NUMBER
  const maxDateAnalyticsDays = useNumericFeatureFlag(FeatureFlagsKeysEnum.MAX_DATE_ANALYTICS_ENABLED_NUMBER, 0);
  const maxDateAnalyticsMs = maxDateAnalyticsDays > 0 ? maxDateAnalyticsDays * 24 * 60 * 60 * 1000 : 0;

  const defaultDateRange = useMemo(
    () => getDefaultDateRange({ organization, subscription, maxDateAnalyticsMs }),
    [organization, subscription, maxDateAnalyticsMs]
  );

  const [selectedDateRange, setSelectedDateRange] = useState<string>(defaultDateRange);

  useEffect(() => {
    setSelectedDateRange(defaultDateRange);
  }, [defaultDateRange]);

  const dateFilterOptions = useMemo(() => {
    const missingSubscription = !subscription && !IS_SELF_HOSTED;

    if (!organization || missingSubscription) {
      return [];
    }

    return buildDateFilterOptions({
      organization: organization,
      apiServiceLevel: subscription?.apiServiceLevel,
      maxDateAnalyticsMs,
    }).map((option) => ({
      ...option,
      icon: option.disabled && !option.disabledDueToAnalyticsLimit ? upgradeCtaIcon : undefined,
    }));
  }, [organization, subscription, upgradeCtaIcon, maxDateAnalyticsMs]);

  const chartsDateRange = useMemo(() => getChartsDateRange(selectedDateRange), [selectedDateRange]);

  const selectedPeriodLabel = useMemo(() => {
    const option = dateFilterOptions.find((opt) => opt.value === selectedDateRange);
    return option?.label?.toLowerCase() || 'selected period';
  }, [selectedDateRange, dateFilterOptions]);

  return {
    selectedDateRange,
    setSelectedDateRange,
    dateFilterOptions,
    chartsDateRange,
    selectedPeriodLabel,
  };
}

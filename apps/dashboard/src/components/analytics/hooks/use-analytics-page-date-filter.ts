import { type OrganizationResource } from '@clerk/types';
import { ApiServiceLevelEnum, FeatureNameEnum, type GetSubscriptionDto, getFeatureForTierAsNumber } from '@novu/shared';
import { useEffect, useMemo, useState } from 'react';
import { IS_SELF_HOSTED } from '../../../config';

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
}: {
  organization: OrganizationResource;
  apiServiceLevel?: ApiServiceLevelEnum;
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

    return {
      disabled: option.ms > maxRetentionMs,
      label: option.label,
      value: option.value,
    };
  });
}

function getDefaultDateRange({
  subscription,
  organization,
}: {
  subscription: GetSubscriptionDto | null | undefined;
  organization: OrganizationResource | null | undefined;
}): string {
  if (!organization || !subscription) {
    return '30d';
  }

  const availableFilters = buildDateFilterOptions({
    organization,
    apiServiceLevel: subscription.apiServiceLevel,
  });

  const thirtyDayOption = availableFilters.find((option) => option.value === '30d' && !option.disabled);

  if (thirtyDayOption) {
    return '30d';
  }

  const firstAvailable = availableFilters.find((option) => !option.disabled);
  return firstAvailable?.value ?? '7d';
}

function getChartsDateRange(selectedDateRange: string) {
  const rangeMs =
    HOME_PAGE_DATE_RANGE_OPTIONS.find((option) => option.value === selectedDateRange)?.ms ?? 30 * 24 * 60 * 60 * 1000;

  return {
    createdAtGte: new Date(Date.now() - rangeMs).toISOString(),
  };
}

type UseHomepageDateFilterParams = {
  organization: OrganizationResource | null | undefined;
  subscription: GetSubscriptionDto | null | undefined;
  upgradeCtaIcon?: React.ComponentType<{ className?: string }>;
};

export function useHomepageDateFilter({ organization, subscription, upgradeCtaIcon }: UseHomepageDateFilterParams) {
  const defaultDateRange = useMemo(
    () => getDefaultDateRange({ organization, subscription }),
    [organization, subscription]
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
    }).map((option) => ({
      ...option,
      icon: option.disabled ? upgradeCtaIcon : undefined,
    }));
  }, [organization, subscription, upgradeCtaIcon]);

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

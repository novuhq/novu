import { type OrganizationResource } from '@clerk/types';
import { ApiServiceLevelEnum, FeatureNameEnum, type GetSubscriptionDto, getFeatureForTierAsNumber } from '@novu/shared';
import { IS_SELF_HOSTED } from '../config';

export const DATE_RANGE_OPTIONS = [
  { value: '24h', label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000 },
  { value: '7d', label: 'Last 7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { value: '30d', label: 'Last 30 days', ms: 30 * 24 * 60 * 60 * 1000 },
  { value: '90d', label: 'Last 90 days', ms: 90 * 24 * 60 * 60 * 1000 },
];

export function buildActivityDateFilters({
  organization,
  apiServiceLevel,
}: {
  organization: OrganizationResource;
  apiServiceLevel?: ApiServiceLevelEnum;
}) {
  const maxActivityFeedRetentionMs = getFeatureForTierAsNumber(
    FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
    IS_SELF_HOSTED ? ApiServiceLevelEnum.UNLIMITED : apiServiceLevel || ApiServiceLevelEnum.FREE,
    true
  );

  return DATE_RANGE_OPTIONS.map((option) => {
    const isLegacyFreeTier =
      apiServiceLevel === ApiServiceLevelEnum.FREE && organization && organization.createdAt < new Date('2025-02-28');

    // legacy free can go up to 30 days
    const legacyFreeMaxRetentionMs = 30 * 24 * 60 * 60 * 1000;
    const maxRetentionMs = isLegacyFreeTier ? legacyFreeMaxRetentionMs : maxActivityFeedRetentionMs;

    return {
      disabled: option.ms > maxRetentionMs,
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
  organization: OrganizationResource | null;
}>) {
  if (!organization || !subscription) {
    return '24h';
  }

  const lastAvailableActivityFeedFilter = buildActivityDateFilters({
    organization,
    apiServiceLevel: subscription.apiServiceLevel,
  })
    .filter((option) => !option.disabled)
    .at(-1);

  return lastAvailableActivityFeedFilter?.value ?? '24h';
}

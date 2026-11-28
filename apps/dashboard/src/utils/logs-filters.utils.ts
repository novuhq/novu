import { ApiServiceLevelEnum, FeatureNameEnum, type GetSubscriptionDto, getFeatureForTierAsNumber } from '@novu/shared';
import { subMilliseconds } from 'date-fns';
import { IS_SELF_HOSTED } from '../config';

type OrganizationLike = { createdAt: Date };

const LOGS_DATE_RANGE_OPTIONS = [
  { value: '24', label: 'Last 24 Hours', ms: 24 * 60 * 60 * 1000 },
  { value: '168', label: '7 Days', ms: 7 * 24 * 60 * 60 * 1000 }, // 7 * 24
  { value: '720', label: '30 Days', ms: 30 * 24 * 60 * 60 * 1000 }, // 30 * 24
  { value: '1440', label: '60 Days', ms: 60 * 24 * 60 * 60 * 1000 }, // 60 * 24
  { value: '2160', label: '90 Days', ms: 90 * 24 * 60 * 60 * 1000 }, // 90 * 24
];

function getLogsRetentionMs({
  organization,
  apiServiceLevel,
}: {
  organization: OrganizationLike;
  apiServiceLevel?: ApiServiceLevelEnum;
}): number {
  const isLegacyFreeTier =
    apiServiceLevel === ApiServiceLevelEnum.FREE && organization && organization.createdAt < new Date('2025-02-28');

  // legacy free can go up to 30 days
  if (isLegacyFreeTier) {
    return 30 * 24 * 60 * 60 * 1000;
  }

  return getFeatureForTierAsNumber(
    FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
    IS_SELF_HOSTED ? ApiServiceLevelEnum.UNLIMITED : apiServiceLevel || ApiServiceLevelEnum.FREE,
    true
  );
}

export function buildLogsDateFilters({
  organization,
  apiServiceLevel,
}: {
  organization: OrganizationLike;
  apiServiceLevel?: ApiServiceLevelEnum;
}) {
  const maxRetentionMs = getLogsRetentionMs({ organization, apiServiceLevel });
  const now = new Date();

  return LOGS_DATE_RANGE_OPTIONS.map((option) => {
    return {
      disabled: option.ms > maxRetentionMs,
      label: option.label,
      value: subMilliseconds(now, option.ms).getTime().toString(),
    };
  });
}

export function getMaxAvailableLogsDateRange({
  subscription,
  organization,
}: Partial<{
  subscription: GetSubscriptionDto | null;
  organization: OrganizationLike | null;
}>) {
  if (!organization || !subscription) {
    const defaultMs = 24 * 60 * 60 * 1000; // 24 hours
    return subMilliseconds(new Date(), defaultMs).getTime().toString();
  }

  const lastAvailableLogsFilter = buildLogsDateFilters({
    organization,
    apiServiceLevel: subscription.apiServiceLevel,
  })
    .filter((option) => !option.disabled)
    .at(-1);

  return (
    lastAvailableLogsFilter?.value ??
    subMilliseconds(new Date(), 24 * 60 * 60 * 1000)
      .getTime()
      .toString()
  );
}

/**
 * The API rejects a createdGte older than the plan's retention window, and searches the whole window when it is left
 * out. A createdGte at or before the window start is left out, so a page left open or a saved link keeps working.
 */
export function toRequestLogsCreatedGte({
  createdGte,
  subscription,
  organization,
  now = new Date(),
}: {
  createdGte?: number;
  subscription?: GetSubscriptionDto | null;
  organization?: OrganizationLike | null;
  now?: Date;
}): number | undefined {
  if (createdGte === undefined || IS_SELF_HOSTED || !organization || !subscription) {
    return createdGte;
  }

  const retentionStart =
    now.getTime() - getLogsRetentionMs({ organization, apiServiceLevel: subscription.apiServiceLevel });

  return createdGte <= retentionStart ? undefined : createdGte;
}

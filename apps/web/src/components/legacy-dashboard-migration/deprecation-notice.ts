import { ApiServiceLevelEnum } from '@novu/shared';
import { differenceInDays, format, isValid, startOfDay } from 'date-fns';

export const DEFAULT_LEGACY_DASHBOARD_DEPRECATION_DATE = '2026-06-30';

export const LEGACY_DASHBOARD_DEPRECATION_NOTICE_ENABLED_FLAG = 'IS_LEGACY_DASHBOARD_DEPRECATION_NOTICE_ENABLED';
export const LEGACY_DASHBOARD_DEPRECATION_DATE_FLAG = 'LEGACY_DASHBOARD_DEPRECATION_DATE';

/** Defaults to enabled so existing behavior is preserved until the flag is configured in LaunchDarkly. */
export const LEGACY_DASHBOARD_DEPRECATION_NOTICE_ENABLED_DEFAULT = true;

/** Bump suffix if the notice should be shown again to everyone who dismissed a previous version. */
export const LEGACY_DASHBOARD_DEPRECATION_MODAL_DISMISSED_KEY = 'novu_legacy_dashboard_deprecation_modal_dismissed_v1';

type OrganizationLike = { _id?: string; name?: string } | null | undefined;

export function parseDeprecationDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);

  if (year && month && day) {
    const parsed = startOfDay(new Date(year, month - 1, day));

    if (isValid(parsed)) {
      return parsed;
    }
  }

  return startOfDay(new Date(2026, 5, 30));
}

function getTimePhrase(daysLeft: number): string {
  if (daysLeft === 0) {
    return 'today';
  }

  return `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
}

export function getDeprecationMessage(deprecationDate: Date): string {
  const daysLeft = differenceInDays(deprecationDate, startOfDay(new Date()));
  const dateLabel = format(deprecationDate, 'do MMMM');

  if (daysLeft < 0) {
    return (
      `⚠️ This dashboard is deprecated. As of ${dateLabel} it is no longer covered by the support SLA. ` +
      `Please migrate to the new dashboard as soon as possible to avoid disruption.`
    );
  }

  return (
    `⚠️ This dashboard will be deprecated ${getTimePhrase(daysLeft)}. After ${dateLabel} you will lose the ` +
    `support SLA for this dashboard. To avoid disruption, please migrate to the new dashboard in advance.`
  );
}

export function buildMigrationGuideUrl(
  apiServiceLevel: ApiServiceLevelEnum | undefined,
  currentOrganization: OrganizationLike,
  utmMedium: 'deprecation_banner' | 'deprecation_modal'
): string {
  const isFreeOrProOrg = apiServiceLevel === ApiServiceLevelEnum.FREE || apiServiceLevel === ApiServiceLevelEnum.PRO;
  const migrationGuideBaseUrl = isFreeOrProOrg ? 'https://dub.sh/eGRzfpk' : 'https://go.novu.co/migration-guide';
  const migrationGuideUrl = new URL(migrationGuideBaseUrl);

  migrationGuideUrl.searchParams.set('utm_source', 'legacy_dashboard');
  migrationGuideUrl.searchParams.set('utm_medium', utmMedium);

  if (currentOrganization?._id) {
    migrationGuideUrl.searchParams.set('utm_campaign', currentOrganization._id);
  }

  if (currentOrganization?.name) {
    migrationGuideUrl.searchParams.set('utm_content', currentOrganization.name.slice(0, 200));
  }

  return migrationGuideUrl.toString();
}

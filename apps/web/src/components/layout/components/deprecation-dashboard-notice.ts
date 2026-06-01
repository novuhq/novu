import { ApiServiceLevelEnum } from '@novu/shared';
import { differenceInDays, startOfDay } from 'date-fns';

export const DASHBOARD_DEPRECATION_DATE = new Date(2026, 5, 30);

/** Bump suffix if the notice should be shown again to everyone who dismissed a previous version. */
export const LEGACY_DASHBOARD_DEPRECATION_MODAL_DISMISSED_KEY = 'novu_legacy_dashboard_deprecation_modal_dismissed_v1';

export function getDaysUntilDashboardDeprecation(): number {
  return Math.max(0, differenceInDays(startOfDay(DASHBOARD_DEPRECATION_DATE), startOfDay(new Date())));
}

type OrganizationLike = { _id?: string; name?: string } | null | undefined;

export function buildMigrationGuideUrl(
  apiServiceLevel: ApiServiceLevelEnum | undefined,
  currentOrganization: OrganizationLike
): string {
  const isFreeOrProOrg = apiServiceLevel === ApiServiceLevelEnum.FREE || apiServiceLevel === ApiServiceLevelEnum.PRO;
  const migrationGuideBaseUrl = isFreeOrProOrg ? 'https://dub.sh/eGRzfpk' : 'https://go.novu.co/migration-guide';
  const migrationGuideUrl = new URL(migrationGuideBaseUrl);

  migrationGuideUrl.searchParams.set('utm_source', 'legacy_dashboard');
  migrationGuideUrl.searchParams.set('utm_medium', 'deprecation_modal');

  if (currentOrganization?._id) {
    migrationGuideUrl.searchParams.set('utm_campaign', currentOrganization._id);
  }

  if (currentOrganization?.name) {
    migrationGuideUrl.searchParams.set('utm_content', currentOrganization.name.slice(0, 200));
  }

  return migrationGuideUrl.toString();
}

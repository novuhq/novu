import { Group } from '@mantine/core';
import { colors, Text, Warning } from '@novu/design-system';
import { ApiServiceLevelEnum } from '@novu/shared';
import { differenceInDays, startOfDay } from 'date-fns';
import { useSubscription } from '../../../ee/billing/hooks/useSubscription';
import { useAuth } from '../../../hooks/useAuth';

const DASHBOARD_DEPRECATION_DATE = new Date(2026, 4, 31);

function getDaysUntilDashboardDeprecation(): number {
  return Math.max(0, differenceInDays(startOfDay(DASHBOARD_DEPRECATION_DATE), startOfDay(new Date())));
}

export function DeprecationBanner() {
  const { apiServiceLevel, isLoading } = useSubscription();
  const { currentOrganization } = useAuth();

  if (isLoading) {
    return null;
  }

  const isFreeOrg = apiServiceLevel === ApiServiceLevelEnum.FREE;
  const migrationGuideBaseUrl = isFreeOrg ? 'https://dub.sh/eGRzfpk' : 'https://go.novu.co/migration-guide';
  const migrationGuideUrl = new URL(migrationGuideBaseUrl);

  if (currentOrganization?.name) {
    migrationGuideUrl.searchParams.set('org_name', currentOrganization.name);
  }

  if (currentOrganization?._id) {
    migrationGuideUrl.searchParams.set('org_id', currentOrganization?._id);
  }

  const MIGRATION_GUIDE_URL = migrationGuideUrl.toString();

  const daysLeft = getDaysUntilDashboardDeprecation();
  const timePhrase = daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;

  return (
    <div
      style={{
        width: '100%',
        padding: '8px 16px',
        background: colors.horizontal,
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      data-test-id="deprecation-banner"
    >
      <Group spacing={8} noWrap style={{ justifyContent: 'center', width: '100%', maxWidth: 1200 }}>
        <Warning color={colors.white} />
        <Text color={colors.white} style={{ whiteSpace: 'normal', minWidth: 0 }}>
          This dashboard will be deprecated {timePhrase}. After 31st May, you will loose support SLA for this dashboard.
          To avoid disruption, please migrate to the new dashboard in advance.{' '}
          <a
            href={MIGRATION_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: colors.white, fontWeight: 700, textDecoration: 'underline' }}
          >
            Migration Guide →
          </a>
        </Text>
      </Group>
    </div>
  );
}

import { Group } from '@mantine/core';
import { colors, Text, Warning } from '@novu/design-system';
import { ApiServiceLevelEnum } from '@novu/shared';
import { differenceInDays, startOfDay } from 'date-fns';
import { useSubscription } from '../../../ee/billing/hooks/useSubscription';

const MIGRATION_GUIDE_URL = 'https://go.novu.co/migration-guide';

const DASHBOARD_DEPRECATION_DATE = new Date(2026, 4, 31);

function getDaysUntilDashboardDeprecation(): number {
  return Math.max(0, differenceInDays(startOfDay(DASHBOARD_DEPRECATION_DATE), startOfDay(new Date())));
}

export function DeprecationBanner() {
  const { apiServiceLevel, isLoading } = useSubscription();

  if (isLoading || apiServiceLevel === ApiServiceLevelEnum.FREE) {
    return null;
  }

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
      <Group spacing={8} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        <Warning color={colors.white} />
        <Text color={colors.white} style={{ whiteSpace: 'normal' }}>
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

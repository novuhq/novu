import { Group } from '@mantine/core';
import { colors, Text, Warning } from '@novu/design-system';
import { ApiServiceLevelEnum } from '@novu/shared';
import { useSubscription } from '../../../ee/billing/hooks/useSubscription';

const MIGRATION_GUIDE_URL = 'https://go.novu.co/migration-guide';

export function DeprecationBanner() {
  const { apiServiceLevel, isLoading } = useSubscription();

  if (isLoading || apiServiceLevel === ApiServiceLevelEnum.FREE) {
    return null;
  }

  return (
    <div
      style={{
        width: '100%',
        padding: 8,
        background: colors.horizontal,
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      data-test-id="deprecation-banner"
    >
      <Group spacing={8}>
        <Warning color={colors.white} />
        <Text color={colors.white}>
          This dashboard will be deprecated after May 31. To avoid disruption, please migrate to the new dashboard in
          advance.{' '}
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

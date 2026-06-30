import { Group } from '@mantine/core';
import { colors } from '@novu/design-system';
import { DeprecationDashboardNoticeContent } from './DeprecationDashboardNoticeContent';
import { useLegacyDashboardMigrationNotice } from './useLegacyDashboardMigrationNotice';

export function DeprecationBanner() {
  const { isEnabled, isLoading, daysLeft, timePhrase, deprecationDateLabel, migrationGuideUrl } =
    useLegacyDashboardMigrationNotice('deprecation_banner');

  if (isLoading || !isEnabled) {
    return null;
  }

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
        <DeprecationDashboardNoticeContent
          migrationGuideUrl={migrationGuideUrl}
          daysLeft={daysLeft}
          timePhrase={timePhrase}
          deprecationDateLabel={deprecationDateLabel}
          variant="banner"
        />
      </Group>
    </div>
  );
}

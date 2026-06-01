import { colors, Text } from '@novu/design-system';

type DeprecationDashboardNoticeContentProps = {
  migrationGuideUrl: string;
  daysLeft: number;
  timePhrase: string;
  variant: 'banner' | 'modal';
};

export function DeprecationDashboardNoticeContent({
  migrationGuideUrl,
  daysLeft,
  timePhrase,
  variant,
}: DeprecationDashboardNoticeContentProps) {
  const isBanner = variant === 'banner';

  return (
    <Text
      color={isBanner ? colors.white : undefined}
      style={
        isBanner ? { whiteSpace: 'normal', minWidth: 0 } : { whiteSpace: 'normal', maxWidth: 640, lineHeight: 1.6 }
      }
    >
      ⚠️ This dashboard will be deprecated {timePhrase}. After 30th June ({daysLeft} days), you will loose support SLA
      for this dashboard. To avoid disruption, please migrate to the new dashboard in advance.{' '}
      <a
        href={migrationGuideUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: isBanner ? colors.white : colors.horizontal,
          fontWeight: 700,
          textDecoration: 'underline',
        }}
      >
        Migration Guide →
      </a>
    </Text>
  );
}

import { colors, Text } from '@novu/design-system';

type DeprecationDashboardNoticeContentProps = {
  migrationGuideUrl: string;
  message: string;
  variant: 'banner' | 'modal';
};

export function DeprecationDashboardNoticeContent({
  migrationGuideUrl,
  message,
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
      {message}{' '}
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

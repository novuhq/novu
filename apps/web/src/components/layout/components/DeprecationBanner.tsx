import { colors, Text, Warning } from '@novu/design-system';
import { Group } from '@mantine/core';
import { ApiServiceLevelEnum } from '@novu/shared';
import { useAuth } from '../../../hooks/useAuth';

export function DeprecationBanner() {
  const { currentOrganization } = useAuth();

  if (currentOrganization?.apiServiceLevel === ApiServiceLevelEnum.FREE) {
    return null;
  }

  return (
    <div
      style={{
        width: '100%',
        padding: 8,
        backgroundColor: '#FFD336',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      data-test-id="deprecation-banner"
    >
      <Group spacing={8}>
        <Warning color={colors.black} />
        <Text color={colors.black}>
          This dashboard is going to be deprecated after 31st May. Please migrate to the new dashboard before time.
        </Text>
      </Group>
    </div>
  );
}

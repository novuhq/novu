import { Progress, Text, useMantineTheme } from '@mantine/core';
import { IIntegratedProvider } from '../IntegrationsStorePage';
import { colors } from '../../../design-system';

import { useMessageCount } from '../../../api/hooks/integrations/useMessageCount';
export const UsageMeter = ({ provider }: { provider: IIntegratedProvider }) => {
  const { data, loading } = useMessageCount(provider.providerId);
  const theme = useMantineTheme();

  if (loading) {
    return null;
  }
  if (!provider?.limits?.hardLimit) return null;

  const messageCount = data?.messageCount as number;
  const hardLimit: number = provider?.limits?.hardLimit;
  const usedPercentage = (messageCount * 100) / hardLimit;
  const label = `Used ${messageCount}/${provider?.limits?.hardLimit}`;

  return (
    <>
      <Text>{label}</Text>
      <Progress
        size={12}
        sections={[
          { value: usedPercentage, color: colors.success },
          { value: 100 - usedPercentage, color: colors.warning },
        ]}
      />
    </>
  );
};

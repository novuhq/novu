import { Title, Text, UnstyledButton, useMantineTheme } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { colors } from '@novu/notification-center';
import { useEnvController } from '../../../hooks';
import { Faq } from '../../quick-start/components/QuickStartWrapper';
import { FrameworkDisplay } from './FrameworkDisplay';

export const InAppSelectFramework = ({ setFramework }: { setFramework: (framework: string) => void }) => {
  const { environment } = useEnvController();
  const theme = useMantineTheme();
  const clipboardEnvironmentIdentifier = useClipboard({ timeout: 1000 });
  const environmentIdentifier = environment?.identifier ? environment.identifier : '';

  const itemStyle = {
    background: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
    borderRadius: 8,
    padding: 16,
    lineHeight: '20px',
    fontSize: '14px',
  };

  return (
    <>
      <Title
        sx={{
          color: theme.colorScheme === 'dark' ? colors.white : colors.B30,
        }}
        order={2}
        mb={16}
      >
        Select a framework
      </Title>
      <FrameworkDisplay setFramework={setFramework} />
      <Text
        sx={{
          color: theme.colorScheme === 'dark' ? colors.white : colors.B30,
        }}
        mb={32}
        mt={16}
      >
        Don’t want to connect your app now? Test In-App center in our{' '}
        <UnstyledButton
          sx={{
            color: colors.error,
            lineHeight: 1,
          }}
          onClick={() => {
            setFramework('demo');
          }}
        >
          Demo App
        </UnstyledButton>
      </Text>
      <Faq />
    </>
  );
};

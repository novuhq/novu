import { Title, Text, UnstyledButton, Group, useMantineTheme, Stack } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { colors } from '@novu/notification-center';
import {
  AngularGradient,
  Copy,
  ReactGradient,
  VueGradient,
  JsGradient,
  CodeGradient,
} from '../../../design-system/icons';
import { useEnvController } from '../../../hooks';
import { Faq } from '../../quick-start/components/QuickStartWrapper';

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
      <Text
        mb={16}
        sx={{
          color: theme.colorScheme === 'dark' ? colors.white : colors.B30,
        }}
      >
        Application ID:{' '}
        <Text display="inline" color={theme.colorScheme === 'dark' ? colors.B80 : colors.B60}>
          {environmentIdentifier}
        </Text>
        <UnstyledButton
          onClick={() => {
            clipboardEnvironmentIdentifier.copy(environmentIdentifier);
          }}
          ml={8}
        >
          <Copy
            color={theme.colorScheme === 'dark' ? colors.B80 : colors.B60}
            width={20}
            height={20}
            viewBox="0 0 25 25"
          />
        </UnstyledButton>
      </Text>
      <Group spacing={16} grow>
        <UnstyledButton
          sx={itemStyle}
          onClick={() => {
            setFramework('react');
          }}
          data-test-id="in-app-select-framework-react"
        >
          <Group spacing={12}>
            <ReactGradient /> React
          </Group>
        </UnstyledButton>
        <UnstyledButton
          onClick={() => {
            setFramework('angular');
          }}
          sx={itemStyle}
          data-test-id="in-app-select-framework-angular"
        >
          <Group spacing={12}>
            <AngularGradient /> Angular
          </Group>
        </UnstyledButton>
        <UnstyledButton
          onClick={() => {
            setFramework('vue');
          }}
          data-test-id="in-app-select-framework-vue"
          sx={itemStyle}
        >
          <Group spacing={12}>
            <VueGradient /> Vue
          </Group>
        </UnstyledButton>
      </Group>
      <Group spacing={16} mt={16} grow>
        <UnstyledButton
          onClick={() => {
            window.open('https://docs.novu.co/notification-center/web-component/');
            setFramework('');
          }}
          sx={itemStyle}
          data-test-id="in-app-select-framework-web-component"
        >
          <Group spacing={12}>
            <JsGradient /> Web Component
          </Group>
        </UnstyledButton>
        <UnstyledButton
          onClick={() => {
            window.open('https://docs.novu.co/notification-center/headless/headless-service/');
            setFramework('');
          }}
          sx={itemStyle}
          data-test-id="in-app-select-framework-headless"
        >
          <Group spacing={12}>
            <JsGradient /> Headless
          </Group>
        </UnstyledButton>
        <UnstyledButton
          onClick={() => {
            setFramework('js');
          }}
          data-test-id="in-app-select-framework-iframe"
          sx={itemStyle}
        >
          <Group spacing={12}>
            <CodeGradient /> iFrame
          </Group>
        </UnstyledButton>
      </Group>
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

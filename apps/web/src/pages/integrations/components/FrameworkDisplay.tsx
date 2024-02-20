import { Text, UnstyledButton, Group, useMantineTheme } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { colors } from '@novu/notification-center';
import { AngularGradient, Copy, ReactGradient, VueGradient, JsGradient, CodeGradient } from '@novu/design-system';
import { UTM_CAMPAIGN_QUERY_PARAM } from '@novu/shared';

import { useEnvController } from '../../../hooks';
import { FrameworkEnum } from '../../quick-start/consts';

export const FrameworkDisplay = ({ setFramework }: { setFramework: (framework: string) => void }) => {
  const { environment } = useEnvController();
  const theme = useMantineTheme();
  const clipboardEnvironmentIdentifier = useClipboard({ timeout: 1000 });
  const environmentIdentifier = environment?.identifier ?? '';

  const itemStyle = {
    background: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
    borderRadius: 8,
    padding: 16,
    lineHeight: '20px',
    fontSize: '14px',
  };

  return (
    <>
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
            setFramework(FrameworkEnum.REACT);
          }}
          data-test-id="in-app-select-framework-react"
        >
          <Group spacing={12}>
            <ReactGradient /> React
          </Group>
        </UnstyledButton>
        <UnstyledButton
          onClick={() => {
            setFramework(FrameworkEnum.ANGULAR);
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
            setFramework(FrameworkEnum.VUE);
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
        <a
          href={`https://docs.novu.co/notification-center/client/web-component${UTM_CAMPAIGN_QUERY_PARAM}`}
          onClick={() => {
            setFramework('');
          }}
          rel="noreferrer"
          target="_blank"
          style={itemStyle}
          data-test-id="in-app-select-framework-web-component"
        >
          <Group noWrap spacing={12}>
            <JsGradient /> <Text truncate="end">Web Component</Text>
          </Group>
        </a>
        <a
          href={`https://docs.novu.co/notification-center/client/headless/get-started${UTM_CAMPAIGN_QUERY_PARAM}`}
          onClick={() => {
            setFramework('');
          }}
          rel="noreferrer"
          target="_blank"
          style={itemStyle}
          data-test-id="in-app-select-framework-headless"
        >
          <Group spacing={12}>
            <JsGradient /> Headless
          </Group>
        </a>
        <UnstyledButton
          onClick={() => {
            setFramework(FrameworkEnum.JS);
          }}
          data-test-id="in-app-select-framework-iframe"
          sx={itemStyle}
        >
          <Group spacing={12}>
            <CodeGradient /> iFrame
          </Group>
        </UnstyledButton>
      </Group>
    </>
  );
};

import { Group, Stack, Title, UnstyledButton } from '@mantine/core';
import { colors } from '@novu/notification-center';
import * as capitalize from 'lodash.capitalize';
import {
  AngularGradient,
  ArrowLeft,
  CodeGradient,
  JsGradient,
  ReactGradient,
  VueGradient,
} from '../../../design-system/icons';

const Icon = ({ framework }: { framework: string }) => {
  switch (framework) {
    case 'react':
      return <ReactGradient />;
    case 'angular':
      return <AngularGradient />;
    case 'vue':
      return <VueGradient />;
    case 'js':
      return <CodeGradient />;
    default:
      return <JsGradient />;
  }
};

export const SetupFrameworkHeader = ({ framework, onGoBack }: { framework: string; onGoBack: () => void }) => {
  return (
    <>
      <UnstyledButton mb={8} onClick={onGoBack}>
        <Group
          spacing={8}
          sx={{
            color: colors.B60,
          }}
        >
          <ArrowLeft />
          Go Back
        </Group>
      </UnstyledButton>
      <Stack align="center">
        <Group spacing={14}>
          <Icon framework={framework} />
          <Title color={colors.B60} size={24} order={2}>
            {framework === 'js' ? 'iFrame' : capitalize(framework)} integration guide
          </Title>
        </Group>
      </Stack>
    </>
  );
};

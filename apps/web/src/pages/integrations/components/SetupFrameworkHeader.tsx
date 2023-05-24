import styled from '@emotion/styled';
import { Group, Stack, Title, UnstyledButton, useMantineTheme } from '@mantine/core';
import { colors } from '@novu/notification-center';
import * as capitalize from 'lodash.capitalize';
import { shadows } from '../../../design-system';
import {
  AngularGradient,
  ArrowLeft,
  Close,
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

export const SetupFrameworkHeader = ({
  framework,
  onGoBack,
  onClose,
}: {
  framework: string;
  onGoBack: () => void;
  onClose: () => void;
}) => {
  const theme = useMantineTheme();

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        paddingLeft: 41,
        paddingRight: 20,
        paddingTop: 16,
        paddingBottom: 24,
        background: colors.B15,
        top: 0,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        zIndex: 9999,
        boxShadow: shadows.dark,
      }}
    >
      <Group position="apart">
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
        <CloseButton data-test-id="connection-integration-close" type="button" onClick={onClose}>
          <Close />
        </CloseButton>
      </Group>
      <Stack align="center">
        <Group spacing={14}>
          <Icon framework={framework} />
          <Title color={colors.B60} size={24} order={2}>
            {framework === 'js' ? 'iFrame' : capitalize(framework)} integration guide
          </Title>
        </Group>
      </Stack>
    </div>
  );
};

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${colors.B40};
  outline: none;

  &:hover {
    cursor: pointer;
  }
`;

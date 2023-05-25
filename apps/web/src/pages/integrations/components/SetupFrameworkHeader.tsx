import styled from '@emotion/styled';
import { Group, Stack, Title, UnstyledButton, useMantineColorScheme } from '@mantine/core';
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
  const { colorScheme } = useMantineColorScheme();

  return (
    <Header>
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
    </Header>
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

const Header = styled.button`
  position: fixed;
  left: 0;
  right: 0;
  padding-left: 41px;
  padding-right: 20px;
  padding-top: 16px;
  padding-bottom: 24px;
  background: ${({ theme }) => {
    return theme.colorScheme === 'dark' ? colors.B15 : colors.white;
  }};
  top: 0;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  z-index: 9999;
  border: none;
  box-shadow: ${({ theme }) => {
    return theme.colorScheme === 'dark' ? shadows.dark : shadows.light;
  }};
`;

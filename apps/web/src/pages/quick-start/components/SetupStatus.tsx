import { Group, Stack, useMantineColorScheme, useMantineTheme } from '@mantine/core';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import styled from '@emotion/styled';
import { Button, colors, Text } from '../../../design-system';
import { ROUTES } from '../../../constants/routes.enum';

export function SetupStatus({ appInitialized, navigatePath }: { appInitialized: boolean; navigatePath: string }) {
  const navigate = useNavigate();

  function handleConfigureLater() {
    navigate(ROUTES.TEMPLATES);
  }

  useEffect(() => {
    let timer;
    if (appInitialized) {
      timer = setTimeout(() => {
        navigate(navigatePath);
      }, 1000);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [appInitialized]);

  return (
    <Stack>
      <Stack spacing={8}>
        <TextStyled>As soon as you run your application, it will send us a request to connect.</TextStyled>
        <TextStyled>
          Status: <GradientStatus>{appInitialized ? 'Connecting' : 'Pending'}...</GradientStatus>
        </TextStyled>
      </Stack>

      <Group>
        <Stack spacing={8}>
          <TextStyled>Don't want to configure the In-App center now?</TextStyled>
          <TextStyled>Configure it later in a notification workflow builder.</TextStyled>
        </Stack>
        <Button variant="outline" onClick={handleConfigureLater}>
          Configure Later
        </Button>
      </Group>
    </Stack>
  );
}

const GradientStatus = styled.span`
  background: linear-gradient(0deg, #14deeb 0%, #446edc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
`;

const TextStyled = styled(Text)`
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B80 : colors.B60)};
`;

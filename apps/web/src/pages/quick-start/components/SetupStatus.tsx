import { Group, Stack, useMantineColorScheme, useMantineTheme } from '@mantine/core';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import styled from '@emotion/styled';
import { Button, colors, Text } from '../../../design-system';
import { ROUTES } from '../../../constants/routes.enum';
import { OnBoardingAnalyticsEnum } from '../consts';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { Label } from '../../../design-system/typography/label';

export function SetupStatus({
  appInitialized,
  navigatePath,
  framework,
}: {
  appInitialized: boolean;
  navigatePath: string;
  framework: string | undefined;
}) {
  const navigate = useNavigate();
  const segment = useSegment();

  function handleConfigureLater() {
    navigate(ROUTES.WORKFLOWS);
    segment.track(OnBoardingAnalyticsEnum.CONFIGURE_LATER_CLICK, { screen: 'framework instructions', framework });
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
          Status: <Label color="blue">{appInitialized ? 'Connecting' : 'Pending'}...</Label>
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

const TextStyled = styled(Text)`
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B80 : colors.B60)};
  display: flex;
  align-items: center;
  gap: 5px;
`;

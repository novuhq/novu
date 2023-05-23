import styled from '@emotion/styled';
import { Stack, Timeline, useMantineColorScheme } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import { getApiKeys } from '../../../api/environment';
import { getInAppActivated } from '../../../api/integration';
import { When } from '../../../components/utils/When';
import { API_ROOT, WS_URL } from '../../../config';
import { colors, shadows, Text } from '../../../design-system';
import { useEnvController } from '../../../hooks';
import { PrismOnCopy } from '../../settings/tabs/components/Prism';
import { SetupStatus } from '../components/SetupStatus';
import { API_KEY, APPLICATION_IDENTIFIER, BACKEND_API_URL, BACKEND_SOCKET_URL, frameworkInstructions } from '../consts';

export const SetupTimeline = ({
  framework,
  onCopy,
  onDone,
  onConfigureLater,
}: {
  framework: string;
  onCopy?: (index: number) => void;
  onDone: () => void;
  onConfigureLater?: () => void;
}) => {
  const { environment } = useEnvController();
  const { data: apiKeys } = useQuery<{ key: string }[]>(['getApiKeys'], getApiKeys);
  const apiKey = apiKeys?.length ? apiKeys[0].key : '';
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const { data: inAppData } = useQuery<IGetInAppActivatedResponse>(['inAppActive'], async () => getInAppActivated(), {
    refetchInterval: (data) => (data?.active ? false : 3000),
    initialData: { active: false },
  });

  const instructions = frameworkInstructions.find((instruction) => instruction.key === framework)?.value ?? [];
  const environmentIdentifier = environment?.identifier ? environment.identifier : '';

  return (
    <Stack align="center" sx={{ width: '100%' }}>
      <TimelineWrapper isDark={isDark}>
        <Timeline
          active={instructions?.length + 1}
          bulletSize={40}
          lineWidth={2}
          styles={{
            itemBullet: {
              backgroundColor: 'grey',
            },
          }}
        >
          {instructions.map((instruction, index) => {
            return (
              <Timeline.Item
                bullet={
                  <div style={{}}>
                    <Text>{index + 1}</Text>
                  </div>
                }
                key={index}
                title={<div>{instruction.instruction}</div>}
              >
                <div style={{ marginTop: 10 }}>
                  <PrismOnCopy
                    language={instruction.language}
                    index={index}
                    code={`${updateCodeSnippet(instruction.snippet, environmentIdentifier, apiKey)}   `}
                    onCopy={onCopy}
                  />
                </div>
              </Timeline.Item>
            );
          })}
          <Timeline.Item
            bullet={
              <div style={{}}>
                <Text>{instructions?.length + 1}</Text>
              </div>
            }
            title={'Render the components and run application'}
          >
            <LoaderWrapper>
              <SetupStatus appInitialized={inAppData.active} onDone={onDone} onConfigureLater={onConfigureLater} />
            </LoaderWrapper>
          </Timeline.Item>
        </Timeline>
      </TimelineWrapper>

      <When truthy={framework === 'demo'}>
        <span style={{ color: colors.B60 }}>
          If your browser did not automatically open, go to localhost at http://localhost:3000
        </span>
      </When>
    </Stack>
  );
};

const LoaderWrapper = styled.div`
  margin-bottom: 20px;
  margin-top: 10px;
`;

function updateCodeSnippet(codeSnippet: string, environmentIdentifier: string, apiKey: string) {
  const concatUrls = process.env.REACT_APP_ENVIRONMENT !== 'production' || !!process.env.REACT_APP_DOCKER_HOSTED_ENV;

  return codeSnippet
    .replace(APPLICATION_IDENTIFIER, environmentIdentifier)
    .replace(API_KEY, apiKey ?? '')
    .replace(BACKEND_API_URL, concatUrls ? API_ROOT : '')
    .replace(BACKEND_SOCKET_URL, concatUrls ? WS_URL : '');
}

interface IGetInAppActivatedResponse {
  active: boolean;
}

const TimelineWrapper = styled.div<{ isDark: boolean }>`
  width: 100%;
  padding: 10px;
  border-radius: 7px;
  .mantine-Timeline-itemBullet {
    background-color: ${({ isDark }) => (isDark ? colors.B30 : colors.BGLight)};
    color: white;
    font-size: 16px;
    font-weight: bold;
    box-shadow: ${({ isDark }) => (isDark ? shadows.dark : shadows.light)};
  }
`;

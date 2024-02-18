import styled from '@emotion/styled';
import { Stack, Timeline, useMantineColorScheme } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import { getApiKeys } from '../../../api/environment';
import { When } from '../../../components/utils/When';
import { API_ROOT, ENV, IS_DOCKER_HOSTED, WS_URL } from '../../../config';
import { colors, shadows, Text } from '@novu/design-system';
import { useEnvController } from '../../../hooks';
import { PrismOnCopy } from '../../settings/tabs/components/Prism';
import { SetupStatus } from './SetupStatus';
import { API_KEY, APPLICATION_IDENTIFIER, BACKEND_API_URL, BACKEND_SOCKET_URL, frameworkInstructions } from '../consts';
import { QueryKeys } from '../../../api/query.keys';
import { useInAppActivated } from '../../../api/hooks';

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
  const { data: apiKeys } = useQuery<{ key: string }[]>([QueryKeys.getApiKeys], getApiKeys);
  const apiKey = apiKeys?.length ? apiKeys[0].key : '';
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const { isInAppActive } = useInAppActivated();

  const instructions = frameworkInstructions.find((instruction) => instruction.key === framework)?.value ?? [];
  const environmentIdentifier = environment?.identifier ?? '';

  return (
    <Stack align="center" sx={{ width: '100%' }} data-test-id="setup-timeline">
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
              <SetupStatus appInitialized={isInAppActive} onDone={onDone} onConfigureLater={onConfigureLater} />
            </LoaderWrapper>
          </Timeline.Item>
        </Timeline>
      </TimelineWrapper>

      <When truthy={framework === 'demo'}>
        <span style={{ color: colors.B60 }}>
          If your browser did not automatically open, go to localhost at http://127.0.0.1:3000
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
  const concatUrls = ENV !== 'production' || !!IS_DOCKER_HOSTED;

  return codeSnippet
    .replace(APPLICATION_IDENTIFIER, environmentIdentifier)
    .replace(API_KEY, apiKey ?? '')
    .replace(BACKEND_API_URL, concatUrls ? API_ROOT : '')
    .replace(BACKEND_SOCKET_URL, concatUrls ? WS_URL : '');
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

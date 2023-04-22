import styled from '@emotion/styled';
import { Stack, Timeline } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { getApiKeys } from '../../../api/environment';
import { getInAppActivated } from '../../../api/integration';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { When } from '../../../components/utils/When';
import { API_ROOT, WS_URL } from '../../../config';
import { ROUTES } from '../../../constants/routes.enum';
import { colors } from '../../../design-system';
import { useEnvController } from '../../../hooks';
import { PrismOnCopy } from '../../settings/tabs/components/Prism';
import { QuickStartWrapper } from '../components/QuickStartWrapper';
import { SetupStatus } from '../components/SetupStatus';
import {
  API_KEY,
  APPLICATION_IDENTIFIER,
  BACKEND_API_URL,
  BACKEND_SOCKET_URL,
  demoSetupSecondaryTitle,
  frameworkInstructions,
  OnBoardingAnalyticsEnum,
} from '../consts';

export function Setup() {
  const segment = useSegment();
  const { framework } = useParams();
  const { environment } = useEnvController();
  const { data: apiKeys } = useQuery<{ key: string }[]>(['getApiKeys'], getApiKeys);
  const apiKey = apiKeys?.length ? apiKeys[0].key : '';

  const { data: inAppData } = useQuery<IGetInAppActivatedResponse>(['inAppActive'], async () => getInAppActivated(), {
    refetchInterval: (data) => stopIfInAppActive(data),
    initialData: { active: false },
  });

  const instructions = frameworkInstructions.find((instruction) => instruction.key === framework)?.value ?? [];
  const environmentIdentifier = environment?.identifier ? environment.identifier : '';
  const goBackRoute = framework === 'demo' ? ROUTES.QUICK_START_NOTIFICATION_CENTER : ROUTES.QUICK_START_SETUP;
  const secondaryTitle = framework === 'demo' ? demoSetupSecondaryTitle : '';

  useEffect(() => {
    segment.track(OnBoardingAnalyticsEnum.FRAMEWORK_SETUP_VISIT, { framework });
  }, []);

  function handleOnCopy(copiedStepIndex: number) {
    const stepNumber = (copiedStepIndex + 1).toString();
    segment.track(OnBoardingAnalyticsEnum.COPIED_STEP, { step: stepNumber });
  }

  return (
    <QuickStartWrapper faq={true} secondaryTitle={secondaryTitle} goBackPath={goBackRoute}>
      <Stack align="center" sx={{ width: '100%' }}>
        <TimelineWrapper>
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
                  bullet={<div style={{}}>{index + 1}</div>}
                  key={index}
                  title={<div>{instruction.instruction}</div>}
                >
                  <div style={{ marginTop: 10 }}>
                    <PrismOnCopy
                      language={instruction.language}
                      index={index}
                      code={`${updateCodeSnippet(instruction.snippet, environmentIdentifier, apiKey)}   `}
                      onCopy={handleOnCopy}
                    />
                  </div>
                </Timeline.Item>
              );
            })}
            <Timeline.Item bullet={instructions?.length + 1} title={'Render the components and run application'}>
              <LoaderWrapper>
                <SetupStatus
                  appInitialized={inAppData.active}
                  navigatePath={`/quickstart/notification-center/set-up/${framework}/success`}
                />
              </LoaderWrapper>
            </Timeline.Item>
          </Timeline>
        </TimelineWrapper>

        <When truthy={framework === 'demo'}>{<OpenBrowser />}</When>
      </Stack>
    </QuickStartWrapper>
  );
}

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

export function OpenBrowser() {
  return (
    <span style={{ color: colors.B60 }}>
      If your browser did not automatically open, go to localhost at http://localhost:3000
    </span>
  );
}

interface IGetInAppActivatedResponse {
  active: boolean;
}

function stopIfInAppActive(data) {
  return data?.active ? false : 3000;
}

const TimelineWrapper = styled.div`
  width: 100%;

  .mantine-Timeline-itemBullet {
    background-color: ${colors.B30};
    color: white;
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0px 5px 20px rgba(0, 0, 0, 0.2);
  }
`;

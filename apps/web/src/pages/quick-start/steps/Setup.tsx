import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, Timeline } from '@mantine/core';

import { ICreateNotificationTemplateDto, INotificationTemplate, StepTypeEnum } from '@novu/shared';

import { QuickStartWrapper } from '../components/QuickStartWrapper';
import { useNotificationGroup, useTemplates, useEnvController } from '../../../hooks';
import {
  API_KEY,
  APPLICATION_IDENTIFIER,
  BACKEND_API_URL,
  BACKEND_SOCKET_URL,
  frameworkInstructions,
  notificationTemplateName,
  OnBoardingAnalyticsEnum,
} from '../consts';
import { createTemplate } from '../../../api/notification-templates';
import { LoaderProceedTernary } from '../components/LoaderProceedTernary';
import { PrismOnCopy } from '../../settings/tabs/components/Prism';
import { When } from '../../../components/utils/When';
import { colors } from '../../../design-system';
import { getInAppActivated } from '../../../api/integration';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { getApiKeys } from '../../../api/environment';
import { API_ROOT, WS_URL } from '../../../config';
import { ROUTES } from '../../../constants/routes.enum';

export function Setup() {
  const segment = useSegment();
  const { framework } = useParams();
  const { groups, loading: notificationGroupLoading } = useNotificationGroup();
  const { templates = [], loading: templatesLoading } = useTemplates();
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

  const { mutateAsync: createNotificationTemplate, isLoading: createTemplateLoading } = useMutation<
    INotificationTemplate,
    { error: string; message: string; statusCode: number },
    ICreateNotificationTemplateDto
  >(createTemplate);

  useEffect(() => {
    segment.track(OnBoardingAnalyticsEnum.FRAMEWORK_SETUP_VISIT, { framework });
  }, []);

  useEffect(() => {
    if (!templatesLoading && !notificationGroupLoading && !createTemplateLoading) {
      const onboardingNotificationTemplate = templates.find((template) =>
        template.name.includes(notificationTemplateName)
      );

      if (!onboardingNotificationTemplate) {
        createOnBoardingTemplate();
      }
    }
  }, [templates]);

  async function createOnBoardingTemplate() {
    const payloadToCreate = {
      notificationGroupId: groups[0]._id,
      name: notificationTemplateName,
      active: true,
      draft: false,
      steps: [
        {
          template: {
            type: StepTypeEnum.IN_APP,
            content: 'Welcome to Novu! <b>visit the cloud admin panel</b> managing this message',
          },
        },
      ],
    } as ICreateNotificationTemplateDto;

    await createNotificationTemplate(payloadToCreate);
  }

  function handleOnCopy(copiedStepIndex: number) {
    const stepNumber = (copiedStepIndex + 1).toString();
    segment.track(OnBoardingAnalyticsEnum.COPIED_STEP, { step: stepNumber });
  }

  return (
    <QuickStartWrapper secondaryTitle={<TroubleshootingDescription />} faq={true} goBackPath={goBackRoute}>
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
            <Timeline.Item bullet={instructions?.length + 1} title={'Waiting for your application to connect to Novu'}>
              <LoaderWrapper>
                <LoaderProceedTernary
                  appInitialized={inAppData.active}
                  navigatePath={`/quickstart/notification-center/set-up/${framework}/trigger`}
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

export function TroubleshootingDescription() {
  return (
    <Stack align="center" sx={{ gap: '20px' }}>
      <span>Follow the installation steps and then sit back while we</span>
      <span>connect to your application</span>
    </Stack>
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

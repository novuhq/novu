import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, Stepper, Timeline } from '@mantine/core';

import { ChannelCTATypeEnum, ICreateNotificationTemplateDto, INotificationTemplate, StepTypeEnum } from '@novu/shared';

import { QuickStartWrapper } from '../components/QuickStartWrapper';
import { useNotificationGroup, useTemplates, useEnvController } from '../../../hooks';
import {
  APPLICATION_IDENTIFIER,
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

export function Setup() {
  const [notificationTemplate, setNotificationTemplate] = useState<INotificationTemplate>();
  const { framework } = useParams();
  const { groups } = useNotificationGroup();
  const { templates = [], loading } = useTemplates();
  const { environment } = useEnvController();
  const segment = useSegment();

  const { data: inAppData } = useQuery<IGetInAppActivatedResponse>(['inAppActive'], async () => getInAppActivated(), {
    refetchInterval: (data) => stopIfInAppActive(data),
    initialData: { active: false },
  });

  const instructions = frameworkInstructions.find((instruction) => instruction.key === framework)?.value ?? [];
  const environmentIdentifier = environment?.identifier ? environment.identifier : '';

  const { mutateAsync: createNotificationTemplate } = useMutation<
    INotificationTemplate,
    { error: string; message: string; statusCode: number },
    ICreateNotificationTemplateDto
  >(createTemplate);

  useEffect(() => {
    segment.track(OnBoardingAnalyticsEnum.FRAMEWORK_SETUP_VISIT, { framework });
  }, []);

  useEffect(() => {
    if (!loading) {
      const onboardingNotificationTemplate = templates.find((template) =>
        template.name.includes(notificationTemplateName)
      );

      if (onboardingNotificationTemplate) {
        setNotificationTemplate(onboardingNotificationTemplate);
      } else {
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
            content:
              'Welcome to Novu! Click on this notification to <b>visit the cloud admin panel</b> managing this message',
            cta: {
              type: ChannelCTATypeEnum.REDIRECT,
              data: { url: `/templates/edit/${notificationTemplate?._id}` },
            },
          },
        },
      ],
    } as ICreateNotificationTemplateDto;

    const createdTemplate = await createNotificationTemplate(payloadToCreate);
    setNotificationTemplate(createdTemplate);
  }

  function handleOnCopy(copiedStepIndex: number) {
    const stepNumber = (copiedStepIndex + 1).toString();
    segment.track(OnBoardingAnalyticsEnum.COPIED_STEP, { step: stepNumber });
  }

  return (
    <QuickStartWrapper secondaryTitle={<TroubleshootingDescription />} faq={true}>
      <Stack align="center">
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
                      code={`${updateCodeSnipped(instruction.snippet, environmentIdentifier)}   `}
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
                  navigatePath={'/quickstart/notification-center/trigger'}
                />
              </LoaderWrapper>
            </Timeline.Item>
          </Timeline>
        </TimelineWrapper>

        <When truthy={framework === 'demo'}>{<OpenBrowser />}</When>
      </Stack>{' '}
    </QuickStartWrapper>
  );
}

const LoaderWrapper = styled.div`
  margin-bottom: 20px;
  margin-top: 10px;
`;

function updateCodeSnipped(codeSnippet: string, environmentIdentifier: string) {
  return codeSnippet.replace(APPLICATION_IDENTIFIER, environmentIdentifier);
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
    <Stack align="center">
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
  .mantine-Timeline-itemBullet {
    background-color: ${colors.B30};
    color: white;
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0px 5px 20px rgba(0, 0, 0, 0.2);
  }
`;

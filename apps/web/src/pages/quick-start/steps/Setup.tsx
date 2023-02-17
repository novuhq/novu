import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, Stepper } from '@mantine/core';

import { ChannelCTATypeEnum, ICreateNotificationTemplateDto, INotificationTemplate, StepTypeEnum } from '@novu/shared';

import { QuickStartWrapper } from '../components/QuickStartWrapper';
import { useNotificationGroup } from '../../../api/hooks/useNotificationGroup';
import { useTemplates } from '../../../api/hooks/useTemplates';
import { useEnvController } from '../../../store/useEnvController';
import { APPLICATION_IDENTIFIER, frameworkInstructions, notificationTemplateName } from '../consts';
import { createTemplate } from '../../../api/notification-templates';
import { LoaderProceedTernary } from '../components/LoaderProceedTernary';
import { Prism } from '../../settings/tabs/components/Prism';
import { When } from '../../../components/utils/When';
import { colors } from '../../../design-system';
import { getInAppActivated } from '../../../api/integration';

export function Setup() {
  const [notificationTemplate, setNotificationTemplate] = useState<INotificationTemplate>();
  const { framework } = useParams();
  const { groups } = useNotificationGroup();
  const { templates = [], loading } = useTemplates();
  const { environment } = useEnvController();

  const { data: inAppData } = useQuery<IGetInAppActivatedResponse>(['inAppActive'], async () => getInAppActivated(), {
    refetchInterval: (data) => stopIfInAppActive(data),
    initialData: { active: false },
  });

  const instructions = frameworkInstructions.find((instruction) => instruction.key === framework)?.value ?? [];
  const openBrowser = framework === 'demo';

  const environmentIdentifier = environment?.identifier ? environment.identifier : '';

  const { mutateAsync: createNotificationTemplate } = useMutation<
    INotificationTemplate,
    { error: string; message: string; statusCode: number },
    ICreateNotificationTemplateDto
  >(createTemplate);

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

  return (
    <QuickStartWrapper secondaryTitle={<TroubleshootingDescription />} faq={true}>
      <LoaderWrapper>
        <LoaderProceedTernary
          appInitialized={inAppData.active}
          navigatePath={'/quickstart/notification-center/trigger'}
        />
      </LoaderWrapper>
      <Stack align="center">
        <Stepper active={0} onStepClick={() => {}} orientation="vertical">
          {instructions.map((instruction, index) => {
            return (
              <Stepper.Step
                label={instruction.instruction}
                description={<Prism code={`${updateCodeSnipped(instruction.snippet, environmentIdentifier)}   `} />}
                key={index}
              />
            );
          })}
        </Stepper>
        <When truthy={openBrowser}>{<OpenBrowser />}</When>
      </Stack>{' '}
    </QuickStartWrapper>
  );
}

const LoaderWrapper = styled.div`
  margin-top: -40px;
  margin-bottom: 20px;
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

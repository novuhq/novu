import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Stack, Stepper } from '@mantine/core';

import { ChannelCTATypeEnum, ICreateNotificationTemplateDto, INotificationTemplate, StepTypeEnum } from '@novu/shared';

import { createTemplate } from '../../../api/notification-templates';
import { Prism } from '../../settings/tabs/components/Prism';
import { frameworkInstructions, notificationTemplateName } from '../consts';
import { useNotificationGroup } from '../../../api/hooks/useNotificationGroup';
import { useTemplates } from '../../../api/hooks/useTemplates';
import { useEnvController } from '../../../store/useEnvController';
import { LoaderProceedTernary } from './LoaderProceedTernary';
import { useInAppActivated } from './useInAppActivated';
import styled from '@emotion/styled';
import { When } from '../../../components/utils/When';
import { colors } from '../../../design-system';

export function SetUp() {
  const [notificationTemplate, setNotificationTemplate] = useState<INotificationTemplate>();
  const { framework } = useParams();
  const { groups } = useNotificationGroup();
  const { templates = [], loading } = useTemplates();
  const { environment } = useEnvController();
  const { initialized } = useInAppActivated();

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
    <>
      <LoaderWrapper>
        <LoaderProceedTernary appInitialized={initialized} navigatePath={'/quickstart/notification-center/trigger'} />
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
      </Stack>
    </>
  );
}

const LoaderWrapper = styled.div`
  margin-top: -40px;
  margin-bottom: 20px;
`;

function updateCodeSnipped(codeSnippet: string, environmentIdentifier: string) {
  return codeSnippet.replace('APPLICATION_IDENTIFIER', environmentIdentifier);
}

export function OpenBrowser() {
  return (
    <span style={{ color: colors.B60 }}>
      If your browser did not automatically open, go to localhost at http://localhost:3000
    </span>
  );
}

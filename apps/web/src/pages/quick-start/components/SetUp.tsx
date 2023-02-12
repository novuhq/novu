import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ChannelCTATypeEnum, ICreateNotificationTemplateDto, INotificationTemplate, StepTypeEnum } from '@novu/shared';
import { createTemplate } from '../../../api/notification-templates';
import { Prism } from '../../settings/tabs/components/Prism';
import { frameworkInstructions, notificationTemplateName } from '../consts';
import { useNotificationGroup } from '../../../api/hooks/useNotificationGroup';
import { useTemplates } from '../../../api/hooks/useTemplates';
import { Stepper } from '@mantine/core';
import { useEnvController } from '../../../store/useEnvController';
import { LoaderProceedTernary } from './LoaderProceedTernary';
import { useInAppActivated } from './useInAppActivated';
import { useParams } from 'react-router-dom';

export function SetUp() {
  const [notificationTemplate, setNotificationTemplate] = useState<INotificationTemplate>();
  const { framework } = useParams();
  const { groups } = useNotificationGroup();
  const { templates = [], loading } = useTemplates();
  const { environment } = useEnvController();
  const { initialized } = useInAppActivated();

  const instructions = frameworkInstructions.find((instruction) => instruction.key === framework)?.value ?? [];
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
      <LoaderProceedTernary appInitialized={initialized} navigatePath={'/quickstart/notification-center/trigger'} />

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
    </>
  );
}

function updateCodeSnipped(codeSnippet: string, environmentIdentifier: string) {
  return codeSnippet.replace('APPLICATION_IDENTIFIER', environmentIdentifier);
}

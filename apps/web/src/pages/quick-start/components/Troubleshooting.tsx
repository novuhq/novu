import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { getInAppActivated } from '../../../api/organization';
import { useMutation } from '@tanstack/react-query';
import { ChannelCTATypeEnum, ICreateNotificationTemplateDto, INotificationTemplate, StepTypeEnum } from '@novu/shared';
import { createTemplate } from '../../../api/notification-templates';
import { Prism } from '../../settings/tabs/components/Prism';
import { notificationTemplateName, reactStarterSnippet } from '../consts';
import { useNotificationGroup } from '../../../api/hooks/useNotificationGroup';
import { useTemplates } from '../../../api/hooks/useTemplates';
import styled from '@emotion/styled';
import { Loader } from '@mantine/core';
import { useEnvController } from '../../../store/useEnvController';

export function Troubleshooting() {
  const [updatedReactStarterSnippet, setUpdatedReactStarterSnippet] = useState<string>(reactStarterSnippet);
  const [notificationTemplate, setNotificationTemplate] = useState<INotificationTemplate>();
  const { groups } = useNotificationGroup();
  const navigate = useNavigate();
  let intervalId: NodeJS.Timer;
  const { templates = [], loading } = useTemplates();
  const { environment } = useEnvController();
  const environmentIdentifier = environment?.identifier ? environment.identifier : '';
  const { mutateAsync: createNotificationTemplate } = useMutation<
    INotificationTemplate,
    { error: string; message: string; statusCode: number },
    ICreateNotificationTemplateDto
  >(createTemplate);

  useEffect(() => {
    setInit();

    intervalId = setInterval(() => setInit(), 3000);
  }, []);

  useEffect(() => {
    if (!loading) {
      const onboardingNotificationTemplate = templates.find((template) =>
        template.name.includes(notificationTemplateName)
      );

      if (onboardingNotificationTemplate) {
        setUpdatedReactStarterSnippet(updateCodeSnipped(onboardingNotificationTemplate, environmentIdentifier));
        setNotificationTemplate(onboardingNotificationTemplate);
      } else {
        createOnBoardingTemplate();
      }
    }
  }, [templates]);

  async function setInit() {
    const activeRes = await getInAppActivated();

    if (activeRes) {
      clearInterval(intervalId);
      navigate('/quickstart/notification-center/trigger');
    }
  }

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
    setUpdatedReactStarterSnippet(updateCodeSnipped(createdTemplate, environmentIdentifier));
    setNotificationTemplate(createdTemplate);
  }

  return (
    <>
      <Prism code={updatedReactStarterSnippet || ''} />
      {/*<WrappedLoader size={100} variant={'bars'} />*/}
    </>
  );
}

function updateCodeSnipped(createdTemplate: INotificationTemplate, environmentIdentifier: string) {
  return reactStarterSnippet.replace('APP_ID_FROM_ADMIN_PANEL', environmentIdentifier);
}

const WrappedLoader = styled(Loader)`
  height: 265px;
`;

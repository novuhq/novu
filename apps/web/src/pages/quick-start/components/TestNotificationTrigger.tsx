import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingOverlay, Stack, useMantineTheme } from '@mantine/core';

import { Button, colors, Text } from '../../../design-system';
import { useTemplates } from '../../../api/hooks/useTemplates';
import { notificationTemplateName, onBoardingSubscriberId } from '../consts';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { testTrigger } from '../../../api/notification-templates';

export function TestNotificationTrigger() {
  const [loader, setLoader] = useState<boolean>(false);
  const [showTemplateSection, setShowTemplateSection] = useState<boolean>(false);
  const { templates = [] } = useTemplates();
  const navigate = useNavigate();
  const { colorScheme } = useMantineTheme();
  const onboardingNotificationTemplate = templates.find((template) => template.name.includes(notificationTemplateName));

  function navigateToNotificationTemplates() {
    navigate('/templates');
  }

  function showTemplateCreation() {
    setLoader(true);
    setTimeout(() => {
      setShowTemplateSection(true);
    }, 2000);
  }

  const onTrigger = async () => {
    try {
      await testTrigger({
        name: onboardingNotificationTemplate?.triggers[0].identifier,
        to: { subscriberId: onBoardingSubscriberId },
        payload: {},
      });

      successMessage('Template triggered successfully');
      showTemplateCreation();
    } catch (e: any) {
      errorMessage(e.message || 'Un-expected error occurred');
    }
  };

  return (
    <>
      <Button data-test-id="test-trigger-notification-btn" onClick={() => onTrigger()}>
        Trigger a notification
      </Button>

      <div style={{ position: 'relative', minHeight: 0 }}>
        <LoadingOverlay
          visible={loader && !showTemplateSection}
          overlayColor={'transparent'}
          loaderProps={{ size: 'md', color: `${colorScheme === 'dark' ? colors.BGLight : colors.B60}` }}
        />
        <Stack align="center" style={{ visibility: showTemplateSection ? 'visible' : 'hidden' }}>
          <Text size={'lg'}>Now that you are all set - let’s move on to create your first notification template:</Text>

          <Button variant="outline" onClick={() => navigateToNotificationTemplates()}>
            Create a template!
          </Button>
        </Stack>
      </div>
    </>
  );
}

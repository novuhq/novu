import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Text } from '../../../design-system';
import { useTemplates } from '../../../api/hooks/useTemplates';
import { notificationTemplateName, onBoardingSubscriberId } from '../consts';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { testTrigger } from '../../../api/notification-templates';
import { When } from '../../../components/utils/When';

export function TestNotificationTrigger() {
  const [triggerSent, setTriggerSent] = useState<boolean>(false);
  const { templates = [] } = useTemplates();
  const navigate = useNavigate();
  const onboardingNotificationTemplate = templates.find((template) => template.name.includes(notificationTemplateName));

  function navigateToNotificationTemplates() {
    navigate('/templates');
  }

  const onTrigger = async () => {
    try {
      await testTrigger({
        name: onboardingNotificationTemplate?.triggers[0].identifier,
        to: { subscriberId: onBoardingSubscriberId },
        payload: {},
      });

      successMessage('Template triggered successfully');
      setTriggerSent(true);
    } catch (e: any) {
      errorMessage(e.message || 'Un-expected error occurred');
    }
  };

  return (
    <>
      <Button data-test-id="test-trigger-notification-btn" onClick={() => onTrigger()}>
        Trigger a notification
      </Button>

      <When truthy={triggerSent}>
        <Text size={'lg'}>Not that you are all set - let’s move on to create your first notification template:</Text>

        <Button variant="outline" onClick={() => navigateToNotificationTemplates()}>
          Create a template!
        </Button>
      </When>
    </>
  );
}

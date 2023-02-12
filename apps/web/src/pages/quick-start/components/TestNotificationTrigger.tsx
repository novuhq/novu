import React, { useState } from 'react';
import {
  INotificationTrigger,
  INotificationTriggerVariable,
  TemplateVariableTypeEnum,
  TriggerTypeEnum,
} from '@novu/shared';
import { useNavigate } from 'react-router-dom';
import { Button, Text } from '../../../design-system';
import { TestWorkflowModal } from '../../../components/templates/TestWorkflowModal';
import { HelpNeeded } from '../QuickStart';
import { useTemplates } from '../../../api/hooks/useTemplates';
import { notificationTemplateName, onBoardingSubscriberId } from '../consts';

export function TestNotificationTrigger() {
  const [opened, setOpened] = useState<boolean>(false);
  const { templates = [] } = useTemplates();

  const navigate = useNavigate();

  function navigateToNotificationTemplates() {
    navigate('/templates');
  }

  return (
    <>
      <Button variant="outline" data-test-id="test-trigger-notification-btn" onClick={() => setOpened(true)}>
        Send Notification
      </Button>
      <Text size={'lg'}>If you are ready, you can create your notification template</Text>
      <Button variant="outline" onClick={() => navigateToNotificationTemplates()}>
        Create Notification Template
      </Button>
      <TestWorkflowModal
        trigger={getNotificationTrigger(templates)}
        setTransactionId={() => {}}
        onDismiss={() => {
          setOpened(false);
        }}
        isVisible={opened}
        openExecutionModal={() => {}}
        minimal={true}
      />
      <HelpNeeded />
    </>
  );
}

function getNotificationTrigger(templates: any[]): INotificationTrigger {
  const onboardingNotificationTemplate = templates.find((template) => template.name.includes(notificationTemplateName));

  return {
    type: TriggerTypeEnum.EVENT,
    identifier: onboardingNotificationTemplate?.triggers[0].identifier ?? '',
    variables: [],
    subscriberVariables: [
      { name: 'subscriberId', value: onBoardingSubscriberId, type: TemplateVariableTypeEnum.STRING, manual: true },
    ] as INotificationTriggerVariable[],
  };
}

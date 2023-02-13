import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';

import {
  INotificationTrigger,
  INotificationTriggerVariable,
  TemplateVariableTypeEnum,
  TriggerTypeEnum,
} from '@novu/shared';

import { Button, Text } from '../../../design-system';
import { TestWorkflowModal } from '../../../components/templates/TestWorkflowModal';
import { useTemplates } from '../../../api/hooks/useTemplates';
import { notificationTemplateName, onBoardingSubscriberId } from '../consts';
import { ExecutionDetailsModalWrapper } from '../../../components/templates/ExecutionDetailsModalWrapper';

export function TestNotificationTrigger() {
  const [opened, setOpened] = useState<boolean>(false);
  const [transactionId, setTransactionId] = useState<string>('');
  const [executionModalOpened, { close: closeExecutionModal, open: openExecutionModal }] = useDisclosure(false);

  const { templates = [] } = useTemplates();

  const navigate = useNavigate();

  function navigateToNotificationTemplates() {
    navigate('/templates');
  }

  return (
    <>
      <Button data-test-id="test-trigger-notification-btn" onClick={() => setOpened(true)}>
        Trigger a notification
      </Button>

      <Text size={'lg'}>Not that you are all set - let’s move on to create your first notification template:</Text>

      <Button variant="outline" onClick={() => navigateToNotificationTemplates()}>
        Create a template!
      </Button>

      <TestWorkflowModal
        trigger={getNotificationTrigger(templates)}
        setTransactionId={setTransactionId}
        onDismiss={() => {
          setOpened(false);
        }}
        isVisible={opened}
        openExecutionModal={openExecutionModal}
        minimal={true}
      />
      <ExecutionDetailsModalWrapper
        transactionId={transactionId}
        isOpen={executionModalOpened}
        onClose={closeExecutionModal}
      />
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

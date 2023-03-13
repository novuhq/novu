import { useMemo, useEffect } from 'react';
import { JsonInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { INotificationTrigger, IUserEntity, INotificationTriggerVariable } from '@novu/shared';
import { Button, Title, Modal } from '../../../design-system';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { getSubscriberValue, getPayloadValue } from './TriggerSnippetTabs';
import { testTrigger } from '../../../api/notification-templates';

const makeToValue = (subscriberVariables: INotificationTriggerVariable[], currentUser?: IUserEntity) => {
  const subsVars = getSubscriberValue(
    subscriberVariables,
    (variable) =>
      (currentUser && currentUser[variable.name === 'subscriberId' ? 'id' : variable.name]) || '<REPLACE_WITH_DATA>'
  );

  return JSON.stringify(subsVars, null, 2);
};

const makePayloadValue = (variables: INotificationTriggerVariable[]) => {
  return JSON.stringify(getPayloadValue(variables), null, 2);
};

function subscriberExist(subscriberVariables: INotificationTriggerVariable[]) {
  return subscriberVariables?.some((variable) => variable.name === 'subscriberId');
}

export function TestWorkflowModal({
  isVisible,
  onDismiss,
  trigger,
  setTransactionId,
  openExecutionModal,
}: {
  isVisible: boolean;
  onDismiss: () => void;
  openExecutionModal: () => void;
  setTransactionId: (id: string) => void;
  trigger: INotificationTrigger;
}) {
  const { currentUser } = useAuthContext();
  const { mutateAsync: triggerTestEvent } = useMutation(testTrigger);

  const subscriberVariables = useMemo(() => {
    if (trigger?.subscriberVariables && subscriberExist(trigger?.subscriberVariables)) {
      return [...(trigger?.subscriberVariables || [])];
    }

    return [{ name: 'subscriberId' }, ...(trigger?.subscriberVariables || [])];
  }, [trigger]);
  const variables = useMemo(() => [...(trigger?.variables || [])], [trigger]);

  const overridesTrigger = `{\n\n}`;

  function jsonValidator(value: string) {
    try {
      JSON.parse(value);
    } catch (e) {
      return 'Invalid JSON';
    }
  }

  const form = useForm({
    initialValues: {
      toValue: makeToValue(subscriberVariables, currentUser),
      payloadValue: makePayloadValue(variables) === '{}' ? `{\n\n}` : makePayloadValue(variables),
      overridesValue: overridesTrigger,
    },
    validate: {
      toValue: jsonValidator,
      payloadValue: jsonValidator,
      overridesValue: jsonValidator,
    },
  });

  useEffect(() => {
    form.setValues({ toValue: makeToValue(subscriberVariables, currentUser) });
  }, [subscriberVariables, currentUser]);

  const onTrigger = async ({ toValue, payloadValue, overridesValue }) => {
    const to = JSON.parse(toValue);
    const payload = JSON.parse(payloadValue);
    const overrides = JSON.parse(overridesValue);

    try {
      const response = await triggerTestEvent({
        name: trigger?.identifier,
        to,
        payload,
        overrides,
      });

      const { transactionId = '' } = response;

      setTransactionId(transactionId);
      successMessage('Template triggered successfully');
      onDismiss();
      openExecutionModal();
    } catch (e: any) {
      Sentry.captureException(e);
      errorMessage(e.message || 'Un-expected error occurred');
    }
  };

  return (
    <Modal
      onClose={onDismiss}
      opened={isVisible}
      title={<Title>Test Trigger </Title>}
      data-test-id="test-trigger-modal"
    >
      <form
        onSubmit={(e) => {
          form.onSubmit(onTrigger)(e);
          e.stopPropagation();
        }}
      >
        <JsonInput
          data-test-id="test-trigger-to-param"
          formatOnBlur
          autosize
          styles={inputStyles}
          label="To"
          {...form.getInputProps('toValue')}
          minRows={3}
          mb={15}
          validationError="Invalid JSON"
        />
        <JsonInput
          data-test-id="test-trigger-payload-param"
          formatOnBlur
          autosize
          styles={inputStyles}
          label="Payload"
          {...form.getInputProps('payloadValue')}
          minRows={3}
          validationError="Invalid JSON"
          mb={15}
        />
        <JsonInput
          data-test-id="test-trigger-overrides-param"
          formatOnBlur
          autosize
          styles={inputStyles}
          label="Overrides (optional)"
          {...form.getInputProps('overridesValue')}
          minRows={3}
          validationError="Invalid JSON"
        />
        <div style={{ alignItems: 'end' }}>
          <Button disabled={!form.isValid()} data-test-id="test-trigger-btn" mt={30} inherit submit>
            Trigger
          </Button>
        </div>
      </form>
    </Modal>
  );
}

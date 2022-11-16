import { useMemo, useEffect } from 'react';
import { JsonInput } from '@mantine/core';
import { useMutation } from 'react-query';
import * as Sentry from '@sentry/react';
import { INotificationTrigger, IUserEntity } from '@novu/shared';

import { Button, Title, Modal } from '../../design-system';
import { inputStyles } from '../../design-system/config/inputs.styles';
import { testTrigger } from '../../api/templates';
import { useContext, useState } from 'react';
import { errorMessage, successMessage } from '../../utils/notifications';
import { AuthContext } from '../../store/authContext';

const makeToValue = (subscriberVariables: { name: string; value?: any }[], currentUser?: IUserEntity) => {
  let to = `{\n`;

  to +=
    subscriberVariables
      ?.map((variable) => {
        return `  "${variable.name}": "${
          (currentUser && currentUser[variable.name === 'subscriberId' ? 'id' : variable.name]) ?? 'REPLACE_WITH_DATA'
        }"`;
      })
      .join(',\n') ?? '';

  to += `\n}`;

  return to;
};

const makePayloadValue = (trigger?: INotificationTrigger) => {
  let payload = `{\n`;

  payload +=
    trigger?.variables
      .map((variable) => {
        return `  "${variable.name}": "REPLACE_WITH_DATA"`;
      })
      .join(',\n') ?? '';

  payload += `\n}`;

  return payload;
};

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
  const { currentUser } = useContext(AuthContext);
  const { mutateAsync: triggerTestEvent } = useMutation(testTrigger);

  const subscriberVariables = useMemo(
    () => [{ name: 'subscriberId' }, ...(trigger?.subscriberVariables || [])],
    [trigger]
  );

  const overridesTrigger = `{\n\n}`;
  const [toValue, setToValue] = useState(() => makeToValue(subscriberVariables, currentUser));
  const [payloadValue, setPayloadValue] = useState(() => makePayloadValue(trigger));
  const [overridesValue, setOverridesValue] = useState(overridesTrigger);

  useEffect(() => {
    setToValue(makeToValue(subscriberVariables, currentUser));
  }, [setToValue, subscriberVariables, currentUser]);

  const onTrigger = async () => {
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
      <JsonInput
        data-test-id="test-trigger-to-param"
        formatOnBlur
        autosize
        styles={inputStyles}
        label="To"
        value={toValue}
        onChange={setToValue}
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
        value={payloadValue}
        onChange={setPayloadValue}
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
        value={overridesValue}
        onChange={setOverridesValue}
        minRows={3}
        validationError="Invalid JSON"
      />

      <div style={{ alignItems: 'end' }}>
        <Button data-test-id="test-trigger-btn" mt={30} inherit onClick={() => onTrigger()}>
          Trigger
        </Button>
      </div>
    </Modal>
  );
}

import { INotificationTrigger } from '@novu/shared';
import { JsonInput } from '@mantine/core';
import { Button, Title, Modal } from '../../design-system';
import { inputStyles } from '../../design-system/config/inputs.styles';
import { useMutation } from 'react-query';
import { testTrigger } from '../../api/templates';
import { useContext, useState } from 'react';
import { errorMessage, successMessage } from '../../utils/notifications';
import * as Sentry from '@sentry/react';
import { AuthContext } from '../../store/authContext';

export function TestWorkflowModal({
  isVisible,
  onDismiss,
  trigger,
}: {
  isVisible: boolean;
  onDismiss: () => void;
  trigger: INotificationTrigger;
}) {
  const { currentUser } = useContext(AuthContext);
  const { mutateAsync: triggerTestEvent } = useMutation(testTrigger);

  const subscriberVariables = [{ name: 'subscriberId' }, ...(trigger?.subscriberVariables || [])];

  const toTrigger = `{ 
    ${subscriberVariables
      ?.map((variable) => {
        return `"${variable.name}": "${
          (currentUser && currentUser[variable.name === 'subscriberId' ? 'id' : variable.name]) ?? 'REPLACE_WITH_DATA'
        }"`;
      })
      .join(',\n    ')}
}`;
  const payloadTrigger = `{
    ${trigger?.variables
      .map((variable) => {
        return `"${variable.name}": "REPLACE_WITH_DATA"`;
      })
      .join(',\n    ')} 
}`;
  const overridesTrigger = `{

}`;

  const [toValue, setToValue] = useState(toTrigger);
  const [payloadValue, setPayloadValue] = useState(payloadTrigger);
  const [overridesValue, setOverridesValue] = useState(overridesTrigger);

  const onTrigger = async () => {
    const to = JSON.parse(toValue);
    const payload = JSON.parse(payloadValue);
    const overrides = JSON.parse(overridesValue);
    try {
      await triggerTestEvent({
        name: trigger?.identifier,
        to,
        payload,
        overrides,
      });
      successMessage('Template triggered successfully');
      onDismiss();
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
      />

      <div style={{ alignItems: 'end' }}>
        <Button data-test-id="test-trigger-btn" mt={30} inherit onClick={() => onTrigger()}>
          Trigger
        </Button>
      </div>
    </Modal>
  );
}

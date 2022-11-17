import { IMessageTemplate, TemplateVariableTypeEnum } from '@novu/shared';
import { Grid } from '@mantine/core';
import { Button, Title, Modal, Text, Input } from '../../../design-system';
import { useMutation } from 'react-query';
import { testTestEmail } from '../../../api/templates';
import { useContext, useEffect, useState } from 'react';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { AuthContext } from '../../../store/authContext';
import { useInputState, useListState } from '@mantine/hooks';
import { useFormContext } from 'react-hook-form';

export function TestSendEmailModal({
  isVisible,
  onDismiss,
  template,
  index,
}: {
  isVisible: boolean;
  index: number;
  onDismiss: () => void;
  template: IMessageTemplate;
}) {
  const { currentUser } = useContext(AuthContext);
  const { watch } = useFormContext();
  const { mutateAsync: testEmailEvent } = useMutation(testTestEmail);
  const [toValue, setToValue] = useInputState<string>(currentUser?.email || '');
  const [submitted, setSubmitted] = useState(false);
  const [variablesValue, handlers] = useListState<{
    name: string;
    value: string | boolean | undefined;
    required: boolean;
  }>([]);

  useEffect(() => {
    const subscription = watch((values) => {
      const variables = values.steps[index].template.variables
        ? values.steps[index].template.variables
            .filter((item) => item.type === TemplateVariableTypeEnum.STRING)
            .map(({ name, defaultValue, required }) => ({ name, value: defaultValue, required }))
        : [];
      console.log(variables);
      handlers.setState(variables);
    });

    return () => subscription.unsubscribe();
  }, [template.variables, watch]);

  const onTestEmail = async () => {
    const payload = variablesValue.reduce((prev, curr) => {
      return { ...prev, [curr.name]: curr.value };
    }, {});

    const toSend = {
      payload,
      to: toValue,
      contentType: template.contentType ?? 'editor',
      ...template,
    };

    try {
      await testEmailEvent(toSend);
      successMessage('Test sent successfully!');
      onDismiss();
    } catch (e: any) {
      errorMessage(e.message || 'Un-expected error occurred');
    }
  };

  return (
    <Modal
      onClose={onDismiss}
      opened={isVisible}
      title={<Title>Send A Test Email</Title>}
      data-test-id="test-trigger-modal"
    >
      <Text>This will explain what this modal does.</Text>
      <Input value={toValue} onChange={setToValue} />
      <Grid>
        {variablesValue.map((value, ind) => (
          <Grid.Col span={6}>
            <Input
              key={ind}
              label={value.name}
              value={value.value as string}
              required={value.required}
              error={'required'}
              onChange={(event) => handlers.setItemProp(ind, 'value', event.currentTarget.value)}
            />
          </Grid.Col>
        ))}
      </Grid>

      <div style={{ alignItems: 'end' }}>
        <Button data-test-id="test-trigger-btn" mt={30} inherit onClick={() => onTestEmail()}>
          Test
        </Button>
      </div>
    </Modal>
  );
}

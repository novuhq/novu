import { IMessageTemplate, TemplateVariableTypeEnum, TemplateSystemVariables } from '@novu/shared';
import { Divider, Grid } from '@mantine/core';
import { Button, Title, Modal, Text, Input, Switch, colors } from '../../../design-system';
import { useMutation } from 'react-query';
import { testSendEmailMessage } from '../../../api/templates';
import { useContext, useEffect, useState } from 'react';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { AuthContext } from '../../../store/authContext';
import { useInputState, useListState } from '@mantine/hooks';
import { useFormContext } from 'react-hook-form';
import styled from 'styled-components';
import { When } from '../../utils/When';

interface IVariable {
  type: TemplateVariableTypeEnum;
  name: string;
  value: string | boolean | undefined;
  required?: boolean;
  ind: number;
}

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
  const { mutateAsync: testSendEmailEvent } = useMutation(testSendEmailMessage);

  const [toValue, setToValue] = useInputState<string>(currentUser?.email || '');
  const [showRequired, setShowRequired] = useState(false);
  const [variablesValue, handlers] = useListState<IVariable>([]);

  const isSystemVariable = (variableName) =>
    TemplateSystemVariables.includes(variableName.includes('.') ? variableName.split('.')[0] : variableName);

  const systemVars = variablesValue.filter((variable) => isSystemVariable(variable.name));
  const userVars = variablesValue.filter((variable) => !isSystemVariable(variable.name));
  const allRequired = variablesValue
    .filter((value) => value.type === TemplateVariableTypeEnum.STRING)
    .some((value) => (value.required || isSystemVariable(value.name)) && !value.value);

  useEffect(() => {
    const subscription = watch((values) => {
      const variables = values.steps[index].template.variables
        ? values.steps[index].template.variables.map(({ name, defaultValue, required, type }, ind) => ({
            name,
            value: defaultValue,
            required,
            type,
            ind,
          }))
        : [];

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

    if (allRequired) {
      setShowRequired(true);

      return;
    } else {
      setShowRequired(false);
    }
    try {
      await testSendEmailEvent(toSend);
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
      data-test-id="test-send-email-modal"
    >
      <Text color={colors.B60}>This will explain what this modal does.</Text>
      <Input mt={30} label="Send to" value={toValue} onChange={setToValue} />
      <When truthy={systemVars.length}>
        <Divider
          label={<Text color={colors.B40}>System Variables</Text>}
          color={colors.B30}
          labelPosition="center"
          my="md"
        />
        <Grid>
          {systemVars
            .filter(({ type }) => type === TemplateVariableTypeEnum.STRING)
            .map(({ name, value, ind }) => (
              <Grid.Col span={6}>
                <Input
                  key={ind}
                  label={name}
                  value={value as string}
                  required={true}
                  error={showRequired && !value && 'required'}
                  onChange={(event) => handlers.setItemProp(ind, 'value', event.currentTarget.value)}
                />
              </Grid.Col>
            ))}
        </Grid>
        <Grid>
          {systemVars
            .filter(({ type }) => type === TemplateVariableTypeEnum.BOOLEAN)
            .map(({ name, value, ind }) => (
              <Grid.Col span={4}>
                <SwitchWrapper>
                  <Switch
                    key={ind}
                    label={name}
                    checked={value as boolean}
                    onChange={(event) => handlers.setItemProp(ind, 'value', event.currentTarget.checked)}
                  />
                </SwitchWrapper>
              </Grid.Col>
            ))}
        </Grid>
      </When>
      <When truthy={userVars.length}>
        <Divider
          label={<Text color={colors.B40}>User Variables</Text>}
          color={colors.B30}
          labelPosition="center"
          my="md"
        />
        <Grid>
          {userVars
            .filter(({ type }) => type === TemplateVariableTypeEnum.STRING)
            .map(({ name, required, value, ind }) => (
              <Grid.Col span={6}>
                <Input
                  key={ind}
                  label={name}
                  value={value as string}
                  required={required}
                  error={showRequired && required && !value && 'required'}
                  onChange={(event) => handlers.setItemProp(ind, 'value', event.currentTarget.value)}
                />
              </Grid.Col>
            ))}
        </Grid>
        <Grid>
          {userVars
            .filter(({ type }) => type === TemplateVariableTypeEnum.BOOLEAN)
            .map(({ name, value, ind }) => (
              <Grid.Col span={4}>
                <SwitchWrapper>
                  <Switch
                    key={ind}
                    label={name}
                    checked={value as boolean}
                    onChange={(event) => handlers.setItemProp(ind, 'value', event.currentTarget.checked)}
                  />
                </SwitchWrapper>
              </Grid.Col>
            ))}
        </Grid>
      </When>

      <div style={{ alignItems: 'end' }}>
        <Button data-test-id="test-send-email-btn" mt={30} inherit onClick={() => onTestEmail()}>
          Test
        </Button>
      </div>
    </Modal>
  );
}

const SwitchWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  .mantine-Switch-root {
    width: auto;
    max-width: inherit;
  }
`;

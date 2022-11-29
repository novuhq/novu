import React, { useContext, useEffect, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { useFormContext, useWatch } from 'react-hook-form';
import styled from '@emotion/styled';
import { useClipboard } from '@mantine/hooks';
import { JsonInput, MultiSelect, Group, ActionIcon } from '@mantine/core';
import * as set from 'lodash.set';
import * as get from 'lodash.get';
import { TemplateVariableTypeEnum, MemberStatusEnum } from '@novu/shared';

import { Button, Text, colors, Tooltip } from '../../../design-system';
import { testSendEmailMessage } from '../../../api/templates';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { AuthContext } from '../../../store/authContext';
import { ArrowDown, Check, Copy, Invite } from '../../../design-system/icons';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import useStyles from '../../../design-system/select/Select.styles';
import { IMustacheVariable } from '../VariableManager';
import { getOrganizationMembers } from '../../../api/organization';

export function TestSendEmail({ index, isIntegrationActive }: { index: number; isIntegrationActive: boolean }) {
  const { currentUser } = useContext(AuthContext);
  const { control } = useFormContext();

  const clipboardJson = useClipboard({ timeout: 1000 });
  const { classes } = useStyles();

  const { mutateAsync: testSendEmailEvent, isLoading } = useMutation(testSendEmailMessage);
  const template = useWatch({
    name: `steps.${index}.template`,
    control,
  });
  const { data: organizationMembers } = useQuery<any[]>('getOrganizationMembers', getOrganizationMembers);

  const [sendTo, setSendTo] = useState<string[]>(currentUser?.email ? [currentUser?.email] : []);
  const [membersEmails, setMembersEmails] = useState<string[]>([currentUser?.email || '']);

  useEffect(() => {
    if (organizationMembers?.length === 0) {
      return;
    }
    setMembersEmails(
      organizationMembers
        ?.filter((member) => member.memberStatus === MemberStatusEnum.ACTIVE)
        .map((member) => member.user?.email) || []
    );
  }, [organizationMembers, setMembersEmails]);

  const processedVariables = processVariables(template.variables);
  const [payloadValue, setPayloadValue] = useState(processedVariables);

  const onTestEmail = async () => {
    const payload = JSON.parse(payloadValue);
    try {
      await testSendEmailEvent({
        ...template,
        payload,
        to: sendTo,
        content: template.contentType === 'customHtml' ? (template.htmlContent as string) : template.content,
      });
      successMessage('Test sent successfully!');
    } catch (e: any) {
      errorMessage(e.message || 'Un-expected error occurred');
    }
  };

  const onSendToCreate = (query: string): undefined => {
    setMembersEmails((current) => [...current, query]);
    setSendTo((current) => [...current, query]);

    return;
  };

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', padding: '20px 25px' }}>
      <Text my={30} color={colors.B60}>
        Fill in the required variables and send send a test to your desired address.
      </Text>

      <Wrapper>
        <MultiSelect
          mt={20}
          radius="md"
          size="md"
          rightSection={<ArrowDown />}
          rightSectionWidth={50}
          required
          error={!sendTo.length && 'At least one email is required'}
          value={sendTo}
          label="Send to"
          classNames={classes}
          styles={inputStyles}
          data={membersEmails}
          onChange={setSendTo}
          creatable
          searchable
          getCreateLabel={(newEmail) => <div>+ Send to {newEmail}</div>}
          onCreate={onSendToCreate}
        />
      </Wrapper>

      <JsonInput
        data-test-id="test-email-json-param"
        formatOnBlur
        mt={20}
        autosize
        styles={inputStyles}
        label="Variables"
        value={payloadValue}
        onChange={setPayloadValue}
        minRows={6}
        mb={15}
        validationError="Invalid JSON"
        rightSectionWidth={50}
        rightSectionProps={{ style: { alignItems: 'start', padding: '5px' } }}
        rightSection={
          <Tooltip label={clipboardJson.copied ? 'Copied!' : 'Copy Json'}>
            <ActionIcon variant="transparent" onClick={() => clipboardJson.copy(payloadValue)}>
              {clipboardJson.copied ? <Check /> : <Copy />}
            </ActionIcon>
          </Tooltip>
        }
      />

      <Group mt={30}>
        <Button
          loading={isLoading}
          icon={<Invite />}
          data-test-id="test-send-email-btn"
          disabled={!isIntegrationActive}
          onClick={() => onTestEmail()}
        >
          Send Test Email
        </Button>
        {!isIntegrationActive && (
          <Text color={colors.error}>{`* Looks like you haven’t configured your email provider yet`}</Text>
        )}
      </Group>
    </div>
  );
}

const processVariables = (variables: IMustacheVariable[]) => {
  const varsObj: Record<string, any> = {};

  variables
    .filter((variable) => variable.type !== TemplateVariableTypeEnum.ARRAY)
    .forEach((variable) => {
      set(varsObj, variable.name, getVariableValue(variable));
    });

  variables
    .filter((variable) => variable.type === TemplateVariableTypeEnum.ARRAY)
    .forEach((variable) => {
      set(varsObj, variable.name, [get(varsObj, variable.name, [])]);
    });

  return JSON.stringify(varsObj, null, 2);
};

const getVariableValue = (variable: IMustacheVariable) => {
  if (variable.type === TemplateVariableTypeEnum.BOOLEAN) {
    return variable.defaultValue;
  }
  if (variable.type === TemplateVariableTypeEnum.STRING) {
    return variable.defaultValue ? variable.defaultValue : variable.name;
  }

  if (variable.type === TemplateVariableTypeEnum.ARRAY) {
    return [];
  }

  return '';
};

const Wrapper = styled.div`
  .mantine-MultiSelect-values {
    min-height: 48px;
    padding: 0;
  }

  .mantine-MultiSelect-input {
    min-height: 50px;

    input {
      height: 100%;
    }
  }
`;

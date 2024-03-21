import { useEffect, useState } from 'react';
import { JsonInput, MultiSelect, ActionIcon } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useFormContext, useWatch } from 'react-hook-form';
import styled from '@emotion/styled';
import { ChannelTypeEnum, MemberStatusEnum } from '@novu/shared';

import { errorMessage, successMessage } from '../../../../utils/notifications';
import { useAuthContext } from '../../../../components/providers/AuthProvider';
import {
  Button,
  Text,
  colors,
  Tooltip,
  ArrowDown,
  Check,
  Copy,
  Invite,
  inputStyles,
  useSelectStyles,
} from '@novu/design-system';
import { getOrganizationMembers } from '../../../../api/organization';
import { useProcessVariables, useIntegrationLimit } from '../../../../hooks';
import { testSendEmailMessage } from '../../../../api/notification-templates';
import { useStepFormPath } from '../../hooks/useStepFormPath';
import type { IForm } from '../formTypes';
import { useTemplateEditorForm } from '../TemplateEditorFormProvider';

export function TestSendEmail({
  isIntegrationActive,
  chimera = false,
}: {
  isIntegrationActive: boolean;
  chimera?: boolean;
}) {
  const { currentUser } = useAuthContext();
  const { control, watch } = useFormContext<IForm>();
  const path = useStepFormPath();
  const stepId = watch(`${path}.uuid`);
  const { template: workflow } = useTemplateEditorForm();

  const clipboardJson = useClipboard({ timeout: 1000 });
  const { classes } = useSelectStyles();

  const { mutateAsync: testSendEmailEvent, isLoading } = useMutation(testSendEmailMessage);
  const template = useWatch({
    name: `${path}.template`,
    control,
  });

  const { data: organizationMembers } = useQuery<any[]>(['getOrganizationMembers'], getOrganizationMembers);
  const { isLimitFetchingEnabled } = useIntegrationLimit(ChannelTypeEnum.EMAIL);

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

  const processedVariables = useProcessVariables(template.variables);
  const [payloadValue, setPayloadValue] = useState('{}');
  const [stepInputs, setStepInputs] = useState('{}');

  useEffect(() => {
    setPayloadValue(processedVariables);
  }, [processedVariables, setPayloadValue]);

  const onTestEmail = async () => {
    const payload = JSON.parse(payloadValue);
    const inputs = JSON.parse(stepInputs);

    try {
      await testSendEmailEvent({
        stepId,
        workflowId: workflow?.triggers[0].identifier,
        contentType: 'customHtml',
        subject: '',
        ...template,
        payload,
        inputs,
        to: sendTo,
        chimera,
        content: chimera
          ? ''
          : template.contentType === 'customHtml'
          ? (template.htmlContent as string)
          : template.content,
        layoutId: template.layoutId,
      });
      successMessage('Test sent successfully!');
    } catch (e: any) {
      errorMessage(e.message || 'Un-expected error occurred');
    }
  };

  return (
    <div>
      <Text mb={30} color={colors.B60}>
        Fill in the required variables and send a test to your desired address.
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
          onCreate={(query) => {
            setMembersEmails((current) => [...current, query]);

            return query;
          }}
          data-test-id="test-email-emails"
        />
      </Wrapper>

      <div style={{ position: 'relative' }}>
        <JsonInput
          data-test-id="test-email-json-param"
          formatOnBlur
          mt={20}
          autosize
          styles={inputStyles}
          label={chimera ? 'Trigger Data' : 'Variables'}
          value={payloadValue}
          onChange={setPayloadValue}
          minRows={12}
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

        {chimera ? (
          <JsonInput
            data-test-id="test-email-json-inputs"
            formatOnBlur
            mt={20}
            autosize
            styles={inputStyles}
            label="Step Inputs"
            value={stepInputs}
            onChange={setStepInputs}
            minRows={12}
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
        ) : null}

        <span
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
          }}
        >
          <Button
            loading={isLoading}
            icon={<Invite />}
            data-test-id="test-send-email-btn"
            disabled={!isIntegrationActive && !isLimitFetchingEnabled}
            onClick={() => onTestEmail()}
          >
            Send Test Email
          </Button>
        </span>
      </div>
      {!isIntegrationActive && (
        <Text color={colors.error}>* Looks like you haven’t configured your email provider yet</Text>
      )}
    </div>
  );
}

const Wrapper = styled.div`
  .mantine-MultiSelect-values {
    min-height: 48px;
    padding: 5px 0;
    row-gap: 5px;
  }

  .mantine-MultiSelect-input {
    min-height: 50px;

    input {
      height: 100%;
    }
  }
`;

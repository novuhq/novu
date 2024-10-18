import { useClipboard } from '@mantine/hooks';
import { IconButton, Input, Textarea } from '@novu/novui';
import { IconCheck, IconCopyAll } from '@novu/novui/icons';
import { Select } from '@novu/design-system';
import { Stack, Box, styled } from '@novu/novui/jsx';
import { FC } from 'react';
import { Controller, FieldPath, useFormContext } from 'react-hook-form';
import { token } from '@novu/novui/tokens';
import { WorkflowDetailFormContext } from './WorkflowDetailFormContextProvider';

export type WorkflowGeneralSettingsFieldName = Extract<
  FieldPath<WorkflowDetailFormContext>,
  'general.workflowId' | 'general.name' | 'general.description' | 'general.tags'
>;

export type WorkflowGeneralSettingsProps = {
  checkShouldDisableField?: (fieldName: WorkflowGeneralSettingsFieldName) => boolean;
  checkShouldHideField?: (fieldName: WorkflowGeneralSettingsFieldName) => boolean;
};

const InboxSnippet = () => (
  <styled.code
    fontSize="75"
    borderRadius="50"
    py="[1px]"
    px="25"
    borderWidth="100"
    borderColor="input.border.disabled"
    shadow="light"
    bg="input.surface.disabled"
  >
    {`<Inbox />`}
  </styled.code>
);

export const WorkflowGeneralSettingsForm: FC<WorkflowGeneralSettingsProps> = ({
  checkShouldDisableField,
  checkShouldHideField,
}) => {
  const {
    control,
    formState: { errors },
  } = useFormContext<WorkflowDetailFormContext>();

  const { copied, copy } = useClipboard();

  return (
    <Stack gap="150">
      {!checkShouldHideField?.('general.workflowId') && (
        <Controller
          name="general.workflowId"
          control={control}
          rules={{
            required: 'Required - Workflow identifier',
            pattern: {
              value: /^[a-z0-9-]+$/,
              message: 'Identifier must contain only lowercase, numeric or dash characters',
            },
          }}
          render={({ field }) => {
            return (
              <Input
                {...field}
                label="Identifier"
                description={
                  <span>
                    A unique, lowercase identifier, using only <code>-</code> (dash) separators
                  </span>
                }
                rightSection={<IconButton Icon={copied ? IconCheck : IconCopyAll} onClick={() => copy(field.value)} />}
                error={errors?.general?.workflowId?.message}
                value={field.value || ''}
                disabled={checkShouldDisableField?.(field.name)}
              />
            );
          }}
        />
      )}
      {!checkShouldHideField?.('general.name') && (
        <Controller
          name="general.name"
          control={control}
          render={({ field }) => {
            return (
              <Input
                {...field}
                label="Name"
                description={
                  <span>
                    A human-friendly name for the workflow, displayed in the Dashboard and the <InboxSnippet />
                  </span>
                }
                value={field.value || ''}
                disabled={checkShouldDisableField?.(field.name)}
                error={errors?.general?.name?.message}
              />
            );
          }}
        />
      )}
      {!checkShouldHideField?.('general.description') && (
        <Controller
          name="general.description"
          control={control}
          render={({ field }) => {
            return (
              <Textarea
                {...field}
                label="Description"
                description="A brief description of the workflow's purpose for team members"
                placeholder="Add a description..."
                value={field.value || ''}
                disabled={checkShouldDisableField?.(field.name)}
                error={errors?.general?.description?.message}
              />
            );
          }}
        />
      )}
      {!checkShouldHideField?.('general.tags') && (
        <Controller
          name="general.tags"
          control={control}
          render={({ field }) => {
            return (
              <Select
                {...field}
                disabled={checkShouldDisableField?.(field.name)}
                label={'Tags'}
                description={
                  <span>
                    Use tags to categorize workflows and filter notifications/preferences in the <InboxSnippet />
                  </span>
                }
                searchable={checkShouldDisableField?.(field.name)}
                type={'multiselect'}
                placeholder="Add tags to categorize the workflow..."
                data={(field.value || [])?.map((item) => ({ label: item, value: item }))}
              />
            );
          }}
        />
      )}
    </Stack>
  );
};

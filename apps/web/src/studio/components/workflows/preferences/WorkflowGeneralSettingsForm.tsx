import { useClipboard } from '@mantine/hooks';
import { IconButton, Input } from '@novu/novui';
import { IconCheck, IconCopyAll } from '@novu/novui/icons';
import { Stack } from '@novu/novui/jsx';
import { FC } from 'react';
import { Controller, FieldPath, useFormContext } from 'react-hook-form';
import { WorkflowDetailFormContext } from './WorkflowDetailFormContextProvider';

export type WorkflowGeneralSettingsFieldName = Extract<
  FieldPath<WorkflowDetailFormContext>,
  'general.workflowId' | 'general.name'
>;

export type WorkflowGeneralSettingsProps = {
  checkShouldDisableField?: (fieldName: WorkflowGeneralSettingsFieldName, fieldValue: string) => boolean;
  checkShouldHideField?: (fieldName: WorkflowGeneralSettingsFieldName) => boolean;
};

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
      {!checkShouldHideField?.('general.name') && (
        <Controller
          name="general.name"
          control={control}
          rules={{ required: 'Required - Workflow name' }}
          render={({ field }) => {
            return (
              <Input
                {...field}
                label="Workflow name"
                value={field.value || ''}
                disabled={checkShouldDisableField?.(field.name, field.value)}
                error={errors?.general?.name?.message}
              />
            );
          }}
        />
      )}
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
                description="Must be unique and all lowercase, using - only"
                rightSection={<IconButton Icon={copied ? IconCheck : IconCopyAll} onClick={() => copy(field.value)} />}
                error={errors?.general?.workflowId?.message}
                value={field.value || ''}
                disabled={checkShouldDisableField?.(field.name, field.value)}
              />
            );
          }}
        />
      )}
    </Stack>
  );
};

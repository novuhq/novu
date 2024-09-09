import { useClipboard } from '@mantine/hooks';
import { IconButton, Input, Textarea } from '@novu/novui';
import { IconCheck, IconCopyAll } from '@novu/novui/icons';
import { Stack } from '@novu/novui/jsx';
import { FC } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { WorkflowDetailFormContext } from './WorkflowDetailFormContextProvider';

export type WorkflowGeneralSettingsProps = {
  areSettingsDisabled?: boolean;
};

export const WorkflowGeneralSettingsForm: FC<WorkflowGeneralSettingsProps> = ({ areSettingsDisabled }) => {
  const {
    control,
    formState: { errors },
  } = useFormContext<WorkflowDetailFormContext>();

  const { copied, copy } = useClipboard();

  return (
    <Stack gap="150">
      {!areSettingsDisabled && (
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
                disabled={areSettingsDisabled}
                error={errors?.general?.name?.message}
              />
            );
          }}
        />
      )}
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
              disabled={areSettingsDisabled}
            />
          );
        }}
      />

      {!areSettingsDisabled && (
        <Controller
          name="general.description"
          control={control}
          render={({ field }) => {
            return (
              <Textarea
                {...field}
                label="Description"
                maxLines={2}
                value={field.value || ''}
                disabled={areSettingsDisabled}
              />
            );
          }}
        />
      )}
    </Stack>
  );
};

import { Control, Controller } from 'react-hook-form';
import { useClipboard } from '@mantine/hooks';
import { JsonInput, ActionIcon } from '@mantine/core';

import { Input, inputStyles, Check, Copy } from '@novu/design-system';
import { ITenantForm } from './UpdateTenantSidebar';

function jsonValidator(value?: string) {
  if (!value) {
    return true;
  }
  try {
    JSON.parse(value);
  } catch (e) {
    return 'Invalid JSON';
  }
}
export const TenantFormCommonFields = ({ control }: { control: Control<ITenantForm, any> }) => {
  const identifierClipboard = useClipboard({ timeout: 1000 });

  return (
    <>
      <Controller
        control={control}
        name="name"
        defaultValue={''}
        rules={{
          required: 'Required - Tenant name',
        }}
        render={({ field, fieldState }) => (
          <Input
            {...field}
            value={field.value}
            description="It helps you to distinguish a tenant from others"
            required
            label="Name"
            error={fieldState.error?.message}
            data-test-id="tenant-name"
          />
        )}
      />
      <Controller
        control={control}
        name="identifier"
        defaultValue={''}
        rules={{
          required: 'Required - Tenant identifier',
          pattern: {
            value: /^[A-Za-z0-9_-]+$/,
            message: 'Identifier must contains only alphabetical, numeric, dash or underscore characters',
          },
        }}
        render={({ field, fieldState }) => (
          <Input
            {...field}
            required
            label="Tenant identifier"
            description="You reference to it when triggering a workflow"
            error={fieldState.error?.message}
            data-test-id="tenant-identifier"
            rightSection={
              <ActionIcon
                variant="transparent"
                disabled={!field.value}
                onClick={() => identifierClipboard.copy(field.value)}
              >
                {identifierClipboard.copied ? <Check /> : <Copy />}
              </ActionIcon>
            }
          />
        )}
      />
      <Controller
        control={control}
        name="data"
        defaultValue={''}
        rules={{
          validate: (value) => jsonValidator(value),
        }}
        render={({ field }) => (
          <JsonInput
            {...field}
            data-test-id="tenant-custom-properties"
            formatOnBlur
            autosize
            placeholder={'{\n\n}'}
            styles={inputStyles}
            label="Custom properties"
            description="Set-up custom properties using JSON format"
            minRows={5}
            validationError="Invalid JSON"
          />
        )}
      />
    </>
  );
};

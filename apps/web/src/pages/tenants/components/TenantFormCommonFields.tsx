import { Control, Controller } from 'react-hook-form';
import { JsonInput } from '@mantine/core';

import { Input } from '../../../design-system';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { ITenantForm } from './UpdateTenantSidebar';

export const TenantFormCommonFields = ({ control }: { control: Control<ITenantForm, any> }) => {
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
          />
        )}
      />
      <Controller
        control={control}
        name="data"
        defaultValue={''}
        render={({ field }) => (
          <JsonInput
            {...field}
            data-test-id="tenant-custom-properties"
            formatOnBlur
            autosize
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

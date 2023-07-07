import { Controller, useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { useClipboard } from '@mantine/hooks';

import { Input, Switch } from '../../../design-system';
import { Check, Copy } from '../../../design-system/icons';
import { IIntegratedProvider } from '../IntegrationsStorePage';

const InputWrapper = styled.div`
  margin-top: 32px;
`;

const CopyWrapper = styled.div`
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
`;

export const UpdateIntegrationCommonFields = ({ provider }: { provider: IIntegratedProvider | null }) => {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const identifierClipboard = useClipboard({ timeout: 1000 });

  if (!provider) return null;

  return (
    <>
      <Controller
        control={control}
        name="active"
        defaultValue={false}
        render={({ field }) => (
          <Switch
            checked={field.value}
            label={field.value ? 'Active' : 'Disabled'}
            data-test-id="is_active_id"
            {...field}
          />
        )}
      />
      <Controller
        control={control}
        name="name"
        defaultValue={''}
        rules={{
          required: 'Required - Instance name',
        }}
        render={({ field }) => (
          <InputWrapper>
            <Input
              {...field}
              value={field.value ? field.value : provider?.displayName}
              required
              label="Name"
              error={errors.name?.message}
            />
          </InputWrapper>
        )}
      />
      <Controller
        control={control}
        name="identifier"
        defaultValue={''}
        rules={{
          required: 'Required - Instance key',
          pattern: {
            value: /^[A-Za-z0-9_-]+$/,
            message: 'Instance key must contains only alphabetical, numeric, dash or underscore characters',
          },
        }}
        render={({ field }) => (
          <InputWrapper>
            <Input
              {...field}
              required
              label="Instance key"
              error={errors.identifier?.message}
              rightSection={
                <CopyWrapper onClick={() => identifierClipboard.copy(field.value)}>
                  {identifierClipboard.copied ? <Check /> : <Copy />}
                </CopyWrapper>
              }
            />
          </InputWrapper>
        )}
      />
    </>
  );
};

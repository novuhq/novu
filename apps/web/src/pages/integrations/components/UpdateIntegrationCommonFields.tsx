import { Controller, useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { useClipboard } from '@mantine/hooks';

import { colors, Input, Switch, Tooltip } from '../../../design-system';
import { Check, Copy } from '../../../design-system/icons';
import type { IIntegratedProvider } from '../types';
import { useIsMultiProviderConfigurationEnabled } from '../../../hooks';

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
  const isMultiProviderConfigurationEnabled = useIsMultiProviderConfigurationEnabled();

  if (!provider) return null;

  return (
    <>
      <Controller
        control={control}
        name="active"
        defaultValue={false}
        render={({ field }) => {
          const switchComponent = (
            <Switch
              checked={field.value}
              label={field.value ? 'Active' : 'Disabled'}
              data-test-id="is_active_id"
              {...field}
            />
          );

          if (isMultiProviderConfigurationEnabled && field.value && provider.primary) {
            return (
              <Tooltip
                label={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ color: colors.B60 }}>Disable instance</div>
                    <div style={{ color: '#EAA900' }}>This action replaces the primary provider flag.</div>
                  </div>
                }
                position="bottom-start"
                multiline
                width={147}
              >
                <div style={{ width: 'fit-content' }}>{switchComponent}</div>
              </Tooltip>
            );
          }

          return switchComponent;
        }}
      />
      <Controller
        control={control}
        name="name"
        defaultValue={''}
        rules={{
          required: 'Required - Instance name',
        }}
        render={({ field }) => (
          <Input
            {...field}
            value={field.value ? field.value : provider?.displayName}
            required
            label="Name"
            error={errors.name?.message}
            data-test-id="provider-instance-name"
          />
        )}
      />
      <Controller
        control={control}
        name="identifier"
        defaultValue={''}
        rules={{
          required: 'Required - Provider identifier',
          pattern: {
            value: /^[A-Za-z0-9_-]+$/,
            message: 'Provider identifier must contains only alphabetical, numeric, dash or underscore characters',
          },
        }}
        render={({ field }) => (
          <Input
            {...field}
            required
            label="Provider identifier"
            error={errors.identifier?.message}
            rightSection={
              <CopyWrapper onClick={() => identifierClipboard.copy(field.value)}>
                {identifierClipboard.copied ? <Check /> : <Copy />}
              </CopyWrapper>
            }
            data-test-id="provider-instance-identifier"
          />
        )}
      />
    </>
  );
};

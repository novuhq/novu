import { Controller, useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { useClipboard } from '@mantine/hooks';

import { Input, Switch, Check, Copy, Tooltip, colors, inputStyles } from '@novu/design-system';
import type { IIntegratedProvider } from '../types';
import { ActionIcon, Input as MantineInput } from '@mantine/core';
import { useEnvController } from '../../../hooks';

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
  const { environment } = useEnvController();
  const identifierClipboard = useClipboard({ timeout: 1000 });
  const clipboardEnvironmentIdentifier = useClipboard({ timeout: 1000 });
  const environmentIdentifier = environment?.identifier ? environment.identifier : '';

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
      <ParamContainer>
        <MantineInput.Wrapper
          label="Application Identifier"
          description="The application identifier is a unique public key, used by the notification center to identify your Novu account."
          styles={inputStyles}
        >
          <Input
            readOnly
            rightSection={
              <Tooltip label={clipboardEnvironmentIdentifier.copied ? 'Copied!' : 'Copy Key'}>
                <ActionIcon
                  variant="transparent"
                  data-test-id={'environment-id-copy'}
                  onClick={() => clipboardEnvironmentIdentifier.copy(environmentIdentifier)}
                >
                  {clipboardEnvironmentIdentifier.copied ? (
                    <Check
                      style={{
                        color: colors.B60,
                      }}
                    />
                  ) : (
                    <Copy
                      style={{
                        color: colors.B60,
                      }}
                    />
                  )}
                </ActionIcon>
              </Tooltip>
            }
            value={environmentIdentifier}
            data-test-id="environment-id"
          />
        </MantineInput.Wrapper>
      </ParamContainer>
    </>
  );
};

const ParamContainer = styled.div`
  max-width: 600px;
  padding-bottom: 32px;
`;

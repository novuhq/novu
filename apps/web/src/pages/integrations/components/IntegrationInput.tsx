import { useMantineTheme } from '@mantine/core';
import styled from '@emotion/styled';
import { CredentialsKeyEnum, IConfigCredentials, secureCredentials } from '@novu/shared';

import { Input, PasswordInput, Switch, Textarea, Text, Tooltip, Select } from '@novu/design-system';
import { IntegrationSecretTextarea } from './IntegrationSecretTextarea';

const SwitchWrapper = styled.div`
  display: flex;
  align-items: center;

  > .mantine-Text-root {
    margin-right: auto;
  }
`;

export function IntegrationInput({
  credential,
  errors,
  field,
  register,
  ignoreTls,
}: {
  credential: IConfigCredentials;
  errors: any;
  field: any;
  register?: any;
  ignoreTls?: boolean;
}) {
  const theme = useMantineTheme();

  if (isNeededToHide(credential.key)) {
    if (credential.type === 'text') {
      return <IntegrationSecretTextarea credential={credential} errors={errors} field={field} register={register} />;
    }

    return (
      <PasswordInput
        label={credential.displayName}
        required={credential.required}
        placeholder={credential.displayName}
        description={credential.description ?? ''}
        data-test-id={credential.key}
        error={errors[credential.key]?.message}
        {...field}
        {...register?.(credential.key, {
          required: credential.required && `Please enter a ${credential.displayName.toLowerCase()}`,
        })}
      />
    );
  }

  if (credential.type === 'text') {
    return (
      <Textarea
        label={credential.displayName}
        required={credential.required}
        placeholder={credential.displayName}
        description={credential.description ?? ''}
        data-test-id={credential.key}
        error={errors[credential.key]?.message}
        {...field}
        {...register?.(credential.key, {
          required: credential.required && `Please enter a ${credential.displayName.toLowerCase()}`,
        })}
      />
    );
  }

  if (credential.type === 'dropdown') {
    return (
      <Select
        {...field}
        label={credential.displayName}
        required={credential.required}
        description={credential.description}
        data-test-id={credential.key}
        error={errors[credential.key]?.message}
        data={credential.dropdown?.map((item) => ({
          label: item.name,
          value: item.value,
        }))}
      />
    );
  }

  if (credential.type === 'switch') {
    let switchComponent = (
      <Switch
        label={field.value ? 'Active' : 'Disabled'}
        required={credential.required}
        placeholder={credential.displayName}
        description={credential.description ?? ''}
        data-test-id={credential.key}
        error={errors[credential.key]?.message}
        {...register?.(credential.key)}
        checked={field.value}
        onChange={field.onChange}
      />
    );

    if (credential.tooltip) {
      switchComponent = (
        <Tooltip
          disabled={credential.tooltip.when !== field.value}
          withinPortal={false}
          position="top"
          width={250}
          multiline
          label={credential.tooltip.text}
        >
          <span>{switchComponent}</span>
        </Tooltip>
      );
    }

    return (
      <SwitchWrapper>
        {credential.displayName && <Text>{credential.displayName}</Text>}
        {switchComponent}
      </SwitchWrapper>
    );
  }

  if (credential.type === 'boolean') {
    return (
      <SwitchWrapper>
        {credential.displayName && <Text>{credential.displayName}</Text>}
        <Switch
          required={credential.required}
          placeholder={credential.displayName}
          description={credential.description ?? ''}
          data-test-id={credential.key}
          error={errors[credential.key]?.message}
          {...register?.(credential.key)}
          checked={field.value}
          onChange={field.onChange}
        />
      </SwitchWrapper>
    );
  }

  return (
    <>
      {credential.key === 'tlsOptions' && ignoreTls ? null : (
        <Input
          label={credential.displayName}
          required={credential.required}
          placeholder={credential.displayName}
          description={credential.description ?? ''}
          data-test-id={credential.key}
          error={errors[credential.key]?.message}
          {...field}
          {...register?.(credential.key, {
            required: credential.required && `Please enter a ${credential.displayName.toLowerCase()}`,
          })}
        />
      )}
    </>
  );
}

function isNeededToHide(keyString: CredentialsKeyEnum): boolean {
  return secureCredentials.some((param) => param === keyString);
}

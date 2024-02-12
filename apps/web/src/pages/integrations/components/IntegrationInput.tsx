import styled from '@emotion/styled';
import { CredentialsKeyEnum, IConfigCredentials, secureCredentials } from '@novu/shared';
import { Input, PasswordInput, Switch, Textarea, Tooltip, Select } from '@novu/design-system';
import { IntegrationSecretTextarea } from './IntegrationSecretTextarea';

const SwitchWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const SwitchDescription = styled.div`
  color: ${({ theme }) => `${theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[6]}`};
  font-size: 14px !important;
  font-weight: 400;
  margin-top: '0px';
  margin-bottom: '10px';
  line-height: '17px';
`;

const SwitchLabel = styled.div`
  color: ${({ theme }) => `${theme.colorScheme === 'dark' ? theme.white : theme.colors.gray[8]}`};
  font-size: 14px !important;
  font-weight: 700;
  margin: 5px auto 5px 0px;
  line-height: 17px;
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
      <>
        <SwitchWrapper>
          {credential.displayName && <SwitchLabel>{credential.displayName}</SwitchLabel>}
          {switchComponent}
        </SwitchWrapper>
        {credential.description && <SwitchDescription>{credential.description}</SwitchDescription>}
      </>
    );
  }

  if (credential.type === 'boolean') {
    return (
      <>
        <SwitchWrapper>
          {credential.displayName && <SwitchLabel>{credential.displayName}</SwitchLabel>}
          <Switch
            required={credential.required}
            placeholder={credential.displayName}
            data-test-id={credential.key}
            error={errors[credential.key]?.message}
            {...register?.(credential.key)}
            checked={field.value}
            onChange={field.onChange}
          />
        </SwitchWrapper>
        {credential.description && <SwitchDescription>{credential.description}</SwitchDescription>}
      </>
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

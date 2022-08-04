import { Textarea } from '@mantine/core';
import { CredentialsKeyEnum, IConfigCredentials } from '@novu/shared';
import { Input, PasswordInput } from '../../../design-system';

export function IntegrationInput({
  credential,
  errors,
  field,
  register,
}: {
  credential: IConfigCredentials;
  errors: any;
  field: any;
  register: any;
}) {
  if (isNeededToHide(credential.key)) {
    return (
      <PasswordInput
        label={credential.displayName}
        required={credential.required}
        placeholder={credential.displayName}
        description={credential.description ?? ''}
        data-test-id={credential.key}
        error={errors[credential.key]?.message}
        {...field}
        {...register(credential.key, {
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
        {...register(credential.key, {
          required: credential.required && `Please enter a ${credential.displayName.toLowerCase()}`,
        })}
      />
    );
  }

  return (
    <Input
      label={credential.displayName}
      required={credential.required}
      placeholder={credential.displayName}
      description={credential.description ?? ''}
      data-test-id={credential.key}
      error={errors[credential.key]?.message}
      {...field}
      {...register(credential.key, {
        required: credential.required && `Please enter a ${credential.displayName.toLowerCase()}`,
      })}
    />
  );
}

function isNeededToHide(keyString: CredentialsKeyEnum): boolean {
  const hideParams: CredentialsKeyEnum[] = [
    CredentialsKeyEnum.ApiKey,
    CredentialsKeyEnum.SecretKey,
    CredentialsKeyEnum.Token,
    CredentialsKeyEnum.Secure,
    CredentialsKeyEnum.Password,
  ];

  return hideParams.some((param) => param === keyString);
}

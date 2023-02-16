import { CredentialsKeyEnum, IConfigCredentials, secureCredentials } from '@novu/shared';
import { Input, PasswordInput, Switch, Textarea } from '../../../design-system';

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

  if (credential.type === 'switch') {
    return (
      <Switch
        styles={() => ({
          root: {
            display: 'block !important',
            maxWidth: '100% !important',
          },
        })}
        label={credential.displayName}
        required={credential.required}
        placeholder={credential.displayName}
        description={credential.description ?? ''}
        data-test-id={credential.key}
        error={errors[credential.key]?.message}
        {...register(credential.key)}
        checked={field.value === 'true'}
        onChange={field.onChange}
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
  return secureCredentials.some((param) => param === keyString);
}

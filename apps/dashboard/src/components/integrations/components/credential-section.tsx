import { CredentialsKeyEnum, IConfigCredential } from '@novu/shared';
import { Control } from 'react-hook-form';
import { Input } from '@/components/primitives/input';
import { SecretInput } from '@/components/primitives/secret-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Switch } from '@/components/primitives/switch';
import { Textarea } from '@/components/primitives/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../primitives/form/form';
import { IntegrationFormData } from '../types';

type CredentialsSectionProps = {
  credential: IConfigCredential;
  control: Control<IntegrationFormData>;
  isReadOnly?: boolean;
  isDisabledWithSwitch?: boolean;
  disabledSwitchMessage?: string;
  name?: 'credentials' | 'configurations';
};

const SECURE_CREDENTIALS = [
  CredentialsKeyEnum.ApiKey,
  CredentialsKeyEnum.ApiToken,
  CredentialsKeyEnum.SecretKey,
  CredentialsKeyEnum.Token,
  CredentialsKeyEnum.Password,
  CredentialsKeyEnum.ServiceAccount,
];

export function CredentialSection({
  credential,
  control,
  isReadOnly,
  isDisabledWithSwitch,
  disabledSwitchMessage,
  name = 'credentials',
}: CredentialsSectionProps) {
  return (
    <FormField
      key={credential.key}
      control={control}
      name={`${name}.${credential.key}`}
      rules={{
        required: credential.required ? `${credential.displayName} is required` : false,
        validate: credential.validation?.validate,
        pattern: credential.validation?.pattern
          ? {
              value: credential.validation.pattern,
              message: credential.validation.message || 'Invalid format',
            }
          : undefined,
      }}
      render={({ field, fieldState }) => (
        <FormItem className="mb-2">
          {credential.type === 'switch' ? (
            <div className="flex items-center justify-between gap-2">
              <FormLabel htmlFor={credential.key} optional={!credential.required}>
                {credential.displayName}
              </FormLabel>
              <FormControl>
                {isDisabledWithSwitch && disabledSwitchMessage ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Switch
                          id={credential.key}
                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                          disabled={true}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{disabledSwitchMessage}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Switch
                    id={credential.key}
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                    disabled={isReadOnly}
                  />
                )}
              </FormControl>
            </div>
          ) : (
            <>
              <FormLabel htmlFor={credential.key} optional={!credential.required}>
                {credential.displayName}
              </FormLabel>
              {credential.type === 'dropdown' && credential.dropdown ? (
                <FormControl>
                  <Select value={field.value || ''} onValueChange={field.onChange} disabled={isReadOnly}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${credential.displayName.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {credential.dropdown.map((option) => (
                        <SelectItem key={option.value || ''} value={option.value || ''}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
              ) : credential.type === 'textarea' ? (
                <FormControl>
                  <Textarea
                    id={credential.key}
                    placeholder={`Enter ${credential.displayName.toLowerCase()}`}
                    value={field.value || ''}
                    onChange={field.onChange}
                    rows={7}
                    disabled={isReadOnly}
                  />
                </FormControl>
              ) : SECURE_CREDENTIALS.includes(credential.key as CredentialsKeyEnum) ? (
                <FormControl>
                  <SecretInput
                    id={credential.key}
                    placeholder={`Enter ${credential.displayName.toLowerCase()}`}
                    value={field.value || ''}
                    onChange={field.onChange}
                    disabled={isReadOnly}
                  />
                </FormControl>
              ) : (
                <FormControl>
                  <Input
                    size={'md'}
                    id={credential.key}
                    type="text"
                    placeholder={`Enter ${credential.displayName.toLowerCase()}`}
                    {...field}
                    hasError={!!fieldState.error}
                    disabled={isReadOnly}
                  />
                </FormControl>
              )}
            </>
          )}

          <FormMessage>{fieldState.error?.message || credential.description}</FormMessage>
        </FormItem>
      )}
    />
  );
}

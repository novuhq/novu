import { CredentialsKeyEnum, IConfigCredential } from '@novu/shared';
import { Control, ControllerFieldState, ControllerRenderProps } from 'react-hook-form';
import { Input } from '@/components/primitives/input';
import { SecretInput } from '@/components/primitives/secret-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Switch } from '@/components/primitives/switch';
import { Textarea } from '@/components/primitives/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel as PrimitiveFormLabel,
} from '../../primitives/form/form';
import { IntegrationFormData } from '../types';
import { DescriptionWithLinks } from './description-with-links';

const SECURE_CREDENTIALS = [
  CredentialsKeyEnum.ApiKey,
  CredentialsKeyEnum.ApiToken,
  CredentialsKeyEnum.SecretKey,
  CredentialsKeyEnum.Token,
  CredentialsKeyEnum.Password,
  CredentialsKeyEnum.ServiceAccount,
];

function FormLabel({ credential }: { credential: IConfigCredential }) {
  return (
    <PrimitiveFormLabel htmlFor={credential.key} optional={!credential.required}>
      {credential.displayName}
    </PrimitiveFormLabel>
  );
}

function SwitchInput({
  credential,
  field,
  isReadOnly,
  isDisabledWithSwitch,
  disabledSwitchMessage,
}: {
  credential: IConfigCredential;
  field: ControllerRenderProps<IntegrationFormData>;
  isReadOnly?: boolean;
  isDisabledWithSwitch?: boolean;
  disabledSwitchMessage?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <FormLabel credential={credential} />
      <FormControl>
        {isDisabledWithSwitch && disabledSwitchMessage ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Switch
                id={credential.key}
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
                disabled={isReadOnly || isDisabledWithSwitch}
              />
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
            disabled={isReadOnly || isDisabledWithSwitch}
          />
        )}
      </FormControl>
    </div>
  );
}

function DropdownInput({
  credential,
  field,
  isReadOnly,
}: {
  credential: IConfigCredential;
  field: ControllerRenderProps<IntegrationFormData>;
  isReadOnly?: boolean;
}) {
  const stringValue = typeof field.value === 'string' ? field.value : '';

  return (
    <>
      <FormLabel credential={credential} />
      <FormControl>
        <Select value={stringValue} onValueChange={field.onChange} disabled={isReadOnly}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${credential.displayName.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {credential.dropdown?.map((option) => (
              <SelectItem key={option.value || ''} value={option.value || ''}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormControl>
    </>
  );
}

function TextareaInput({
  credential,
  field,
  isReadOnly,
}: {
  credential: IConfigCredential;
  field: ControllerRenderProps<IntegrationFormData>;
  isReadOnly?: boolean;
}) {
  const stringValue = typeof field.value === 'string' ? field.value : '';

  return (
    <>
      <FormLabel credential={credential} />
      <FormControl>
        <Textarea
          id={credential.key}
          placeholder={`Enter ${credential.displayName.toLowerCase()}`}
          value={stringValue}
          onChange={field.onChange}
          rows={7}
          disabled={isReadOnly}
        />
      </FormControl>
    </>
  );
}

function SecretInputControl({
  credential,
  field,
  isReadOnly,
}: {
  credential: IConfigCredential;
  field: ControllerRenderProps<IntegrationFormData>;
  isReadOnly?: boolean;
}) {
  const stringValue = typeof field.value === 'string' ? field.value : '';

  return (
    <>
      <FormLabel credential={credential} />
      <FormControl>
        <SecretInput
          id={credential.key}
          placeholder={`Enter ${credential.displayName.toLowerCase()}`}
          value={stringValue}
          onChange={field.onChange}
          disabled={isReadOnly}
        />
      </FormControl>
    </>
  );
}

function TextInputControl({
  credential,
  field,
  fieldState,
  isReadOnly,
}: {
  credential: IConfigCredential;
  field: ControllerRenderProps<IntegrationFormData>;
  fieldState: ControllerFieldState;
  isReadOnly?: boolean;
}) {
  const stringValue = typeof field.value === 'string' ? field.value : '';

  return (
    <>
      <FormLabel credential={credential} />
      <FormControl>
        <Input
          size={'md'}
          id={credential.key}
          type="text"
          placeholder={`Enter ${credential.displayName.toLowerCase()}`}
          value={stringValue}
          onChange={field.onChange}
          onBlur={field.onBlur}
          name={field.name}
          hasError={!!fieldState.error}
          disabled={isReadOnly}
        />
      </FormControl>
    </>
  );
}

function InputControl({
  credential,
  field,
  fieldState,
  isReadOnly,
  isDisabledWithSwitch,
  disabledSwitchMessage,
}: {
  credential: IConfigCredential;
  field: ControllerRenderProps<IntegrationFormData>;
  fieldState: ControllerFieldState;
  isReadOnly?: boolean;
  isDisabledWithSwitch?: boolean;
  disabledSwitchMessage?: string;
}) {
  if (credential.type === 'switch') {
    return (
      <SwitchInput
        credential={credential}
        field={field}
        isReadOnly={isReadOnly}
        isDisabledWithSwitch={isDisabledWithSwitch}
        disabledSwitchMessage={disabledSwitchMessage}
      />
    );
  }

  if (credential.type === 'dropdown' && credential.dropdown) {
    return <DropdownInput credential={credential} field={field} isReadOnly={isReadOnly} />;
  }

  if (credential.type === 'textarea') {
    return <TextareaInput credential={credential} field={field} isReadOnly={isReadOnly} />;
  }

  if (SECURE_CREDENTIALS.includes(credential.key as CredentialsKeyEnum)) {
    return <SecretInputControl credential={credential} field={field} isReadOnly={isReadOnly} />;
  }

  return <TextInputControl credential={credential} field={field} fieldState={fieldState} isReadOnly={isReadOnly} />;
}

export function CredentialSection({
  credential,
  control,
  isReadOnly,
  isDisabledWithSwitch,
  disabledSwitchMessage,
  name = 'credentials',
}: {
  credential: IConfigCredential;
  control: Control<IntegrationFormData>;
  isReadOnly?: boolean;
  isDisabledWithSwitch?: boolean;
  disabledSwitchMessage?: string;
  name?: 'credentials' | 'configurations';
}) {
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
          <InputControl
            credential={credential}
            field={field}
            fieldState={fieldState}
            isReadOnly={isReadOnly}
            isDisabledWithSwitch={isDisabledWithSwitch}
            disabledSwitchMessage={disabledSwitchMessage}
          />

          <FormMessage>
            {fieldState.error?.message ||
              (credential.description && (
                <DescriptionWithLinks description={credential.description} links={credential.links} />
              ))}
          </FormMessage>
        </FormItem>
      )}
    />
  );
}

import { CredentialsKeyEnum, IConfigCredential } from '@novu/shared';
import { ReactNode } from 'react';
import { Control, ControllerFieldState, ControllerRenderProps } from 'react-hook-form';
import { CopyButton } from '@/components/primitives/copy-button';
import { Input } from '@/components/primitives/input';
import { SecretInput } from '@/components/primitives/secret-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Switch } from '@/components/primitives/switch';
import { Textarea } from '@/components/primitives/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useEnvironment } from '../../../context/environment/hooks';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel as PrimitiveFormLabel,
} from '../../primitives/form/form';
import { InlineToast } from '../../primitives/inline-toast';
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

function FormLabel({ credential, tooltip }: { credential: IConfigCredential; tooltip?: ReactNode }) {
  return (
    <PrimitiveFormLabel htmlFor={credential.key} required={credential.required} optional={!credential.required} tooltip={tooltip}>
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
  tooltip,
}: {
  credential: IConfigCredential;
  field: ControllerRenderProps<IntegrationFormData>;
  isReadOnly?: boolean;
  isDisabledWithSwitch?: boolean;
  disabledSwitchMessage?: string;
  tooltip?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <FormLabel credential={credential} tooltip={tooltip} />
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

const NULL_DROPDOWN_VALUE = '__null__';

function toSelectValue(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return NULL_DROPDOWN_VALUE;

  return value;
}

function fromSelectValue(value: string): string {
  if (value === NULL_DROPDOWN_VALUE) return '';

  return value;
}

function DropdownInput({
  credential,
  field,
  isReadOnly,
  tooltip,
}: {
  credential: IConfigCredential;
  field: ControllerRenderProps<IntegrationFormData>;
  isReadOnly?: boolean;
  tooltip?: ReactNode;
}) {
  const stringValue = typeof field.value === 'string' ? field.value : '';

  return (
    <>
      <FormLabel credential={credential} tooltip={tooltip} />
      <FormControl>
        <Select
          value={toSelectValue(stringValue)}
          onValueChange={(val) => field.onChange(fromSelectValue(val))}
          disabled={isReadOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder={credential.placeholder ?? `Select ${credential.displayName.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {credential.dropdown?.map((option) => (
              <SelectItem key={toSelectValue(option.value)} value={toSelectValue(option.value)}>
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

function PushResources({ credential, integrationId }: { credential: IConfigCredential; integrationId?: string }) {
  const { currentEnvironment } = useEnvironment();
  const environmentId = currentEnvironment?._id || '';

  const resources = [
    {
      key: 'environmentId',
      label: 'Environment ID',
      value: environmentId,
    },
    {
      key: 'integrationId',
      label: 'Integration ID',
      value: integrationId || '',
    },
  ];

  return (
    <FormItem className="mb-2" key={credential.key}>
      <div className="space-y-3">
        {resources.map((resource) => {
          const inputId = `${credential.key}_${resource.key}`;
          return (
            <div key={resource.key} className="grid grid-cols-[150px_1fr] items-center gap-3">
              <label
                htmlFor={inputId}
                className="text-foreground-600 font-medium inline-flex items-center gap-1 text-xs whitespace-nowrap"
              >
                {resource.label}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  className="cursor-default font-mono text-neutral-500!"
                  id={inputId}
                  value={resource.value}
                  type="text"
                  readOnly={true}
                  trailingNode={<CopyButton valueToCopy={resource.value} />}
                />
              </div>
            </div>
          );
        })}

        <InlineToast
          variant={'tip'}
          className="mt-3"
          description="Configure your existing app to send push events to Novu. Refer to the documentation for the complete setup."
          ctaLabel="View Guide"
          onCtaClick={() => {
            window.open('https://docs.novu.co/platform/integrations/push/push-activity-tracking', '_blank');
          }}
        />
      </div>
      <FormMessage>
        {credential.description && (
          <DescriptionWithLinks description={credential.description} links={credential.links} />
        )}
      </FormMessage>
    </FormItem>
  );
}

function InputControl({
  credential,
  field,
  fieldState,
  isReadOnly,
  isDisabledWithSwitch,
  disabledSwitchMessage,
  integrationId,
  tooltip,
}: {
  credential: IConfigCredential;
  field: ControllerRenderProps<IntegrationFormData>;
  fieldState: ControllerFieldState;
  isReadOnly?: boolean;
  isDisabledWithSwitch?: boolean;
  disabledSwitchMessage?: string;
  integrationId?: string;
  tooltip?: ReactNode;
}) {
  if (credential.type === 'pushResources') {
    return <PushResources credential={credential} integrationId={integrationId} />;
  }

  if (credential.type === 'switch') {
    return (
      <SwitchInput
        credential={credential}
        field={field}
        isReadOnly={isReadOnly}
        isDisabledWithSwitch={isDisabledWithSwitch}
        disabledSwitchMessage={disabledSwitchMessage}
        tooltip={tooltip}
      />
    );
  }

  if (credential.type === 'dropdown' && credential.dropdown) {
    return <DropdownInput credential={credential} field={field} isReadOnly={isReadOnly} tooltip={tooltip} />;
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
  integrationId,
}: {
  credential: IConfigCredential;
  control: Control<IntegrationFormData>;
  isReadOnly?: boolean;
  isDisabledWithSwitch?: boolean;
  disabledSwitchMessage?: string;
  name?: 'credentials' | 'configurations';
  integrationId?: string;
}) {
  return (
    <FormField
      key={`${credential.key}-${integrationId || 'no-id'}`}
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
            integrationId={integrationId}
            tooltip={
              credential.tooltip?.text ? (
                <DescriptionWithLinks description={credential.tooltip?.text} links={credential.links} />
              ) : undefined
            }
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

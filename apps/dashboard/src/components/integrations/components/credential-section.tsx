import { IConfigCredential, isMaskedSecret } from '@novu/shared';
import { ReactNode } from 'react';
import { Control, ControllerFieldState, ControllerRenderProps, useWatch } from 'react-hook-form';
import { Button } from '@/components/primitives/button';
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
import { SavedSecretField } from './saved-secret-field';
import { useSecretReplacement } from './use-secret-replacement';
import { credentialValueToInputString, isSecureCredential } from './utils/helpers';

/** The field's explanation for the "i" next to its label: its tooltip and its description, when it has them. */
function getCredentialTooltip(credential: IConfigCredential): ReactNode {
  const parts = [credential.tooltip?.text, credential.description].filter((part): part is string => !!part);
  if (parts.length === 0) return undefined;

  return (
    <div className="flex max-w-[280px] flex-col gap-1">
      {parts.map((part) => (
        <DescriptionWithLinks key={part} description={part} links={credential.links} />
      ))}
    </div>
  );
}

function FormLabel({ credential, tooltip }: { credential: IConfigCredential; tooltip?: ReactNode }) {
  return (
    <PrimitiveFormLabel
      htmlFor={credential.key}
      required={credential.required}
      optional={!credential.required}
      tooltip={tooltip}
    >
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

function CancelReplaceButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="secondary" mode="ghost" size="sm" onClick={onClick}>
      Cancel
    </Button>
  );
}

function TextareaInput({
  credential,
  field,
  isReadOnly,
  tooltip,
  savedValue,
}: {
  credential: IConfigCredential;
  field: ControllerRenderProps<IntegrationFormData>;
  isReadOnly?: boolean;
  tooltip?: ReactNode;
  /** The mask of the secret on the server, for a multi-line secret such as a service account file. */
  savedValue?: string;
}) {
  const stringValue = typeof field.value === 'string' ? field.value : undefined;
  const secret = useSecretReplacement({ value: stringValue, savedValue, onChange: field.onChange });

  if (secret.isSaved) {
    return (
      <>
        <FormLabel credential={credential} tooltip={tooltip} />
        <SavedSecretField
          id={credential.key}
          label={credential.displayName}
          maskedValue={stringValue ?? ''}
          isReadOnly={isReadOnly}
          onReplace={secret.startReplacing}
        />
      </>
    );
  }

  return (
    <>
      <FormLabel credential={credential} tooltip={tooltip} />
      <FormControl>
        <Textarea
          id={credential.key}
          placeholder={credential.placeholder ?? `Enter ${credential.displayName.toLowerCase()}`}
          value={secret.canCancel ? secret.inputValue : credentialValueToInputString(field.value)}
          onChange={(event) => secret.onInputChange(event.target.value)}
          rows={7}
          disabled={isReadOnly}
          autoFocus={secret.isReplacing}
        />
      </FormControl>
      {secret.canCancel && !isReadOnly && (
        <div className="flex justify-end">
          <CancelReplaceButton onClick={secret.cancel} />
        </div>
      )}
    </>
  );
}

function SecretInputControl({
  credential,
  field,
  isReadOnly,
  tooltip,
  hasError,
  savedValue,
}: {
  credential: IConfigCredential;
  field: ControllerRenderProps<IntegrationFormData>;
  isReadOnly?: boolean;
  tooltip?: ReactNode;
  hasError?: boolean;
  /** The mask of the secret on the server, when there is one. */
  savedValue?: string;
}) {
  const stringValue = typeof field.value === 'string' ? field.value : undefined;
  const secret = useSecretReplacement({ value: stringValue, savedValue, onChange: field.onChange });

  if (secret.isSaved) {
    return (
      <>
        <FormLabel credential={credential} tooltip={tooltip} />
        <SavedSecretField
          id={credential.key}
          label={credential.displayName}
          maskedValue={stringValue ?? ''}
          isReadOnly={isReadOnly}
          onReplace={secret.startReplacing}
        />
      </>
    );
  }

  return (
    <>
      <FormLabel credential={credential} tooltip={tooltip} />
      <div className="flex items-center gap-1.5">
        <FormControl>
          <SecretInput
            id={credential.key}
            placeholder={`Enter ${credential.displayName.toLowerCase()}`}
            value={secret.inputValue}
            onChange={secret.onInputChange}
            disabled={isReadOnly}
            hasError={hasError}
            // Replace swaps the saved secret for this input, so typing can start right away.
            autoFocus={secret.isReplacing}
          />
        </FormControl>
        {secret.canCancel && !isReadOnly && <CancelReplaceButton onClick={secret.cancel} />}
      </div>
    </>
  );
}

function TextInputControl({
  credential,
  field,
  fieldState,
  isReadOnly,
  tooltip,
}: {
  credential: IConfigCredential;
  field: ControllerRenderProps<IntegrationFormData>;
  fieldState: ControllerFieldState;
  isReadOnly?: boolean;
  tooltip?: ReactNode;
}) {
  const stringValue = typeof field.value === 'string' ? field.value : '';

  return (
    <>
      <FormLabel credential={credential} tooltip={tooltip} />
      <FormControl>
        <Input
          size={'md'}
          id={credential.key}
          type="text"
          placeholder={credential.placeholder ?? `Enter ${credential.displayName.toLowerCase()}`}
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

function PushResources({
  credential,
  integrationId,
  integrationEnvironmentId,
}: {
  credential: IConfigCredential;
  integrationId?: string;
  integrationEnvironmentId?: string;
}) {
  const { currentEnvironment } = useEnvironment();
  // The integration's own environment, which the open environment isn't when it was opened from another one.
  const environmentId = integrationEnvironmentId || currentEnvironment?._id || '';

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
  integrationEnvironmentId,
  tooltip,
  isRejected,
  savedValue,
}: {
  credential: IConfigCredential;
  field: ControllerRenderProps<IntegrationFormData>;
  fieldState: ControllerFieldState;
  isReadOnly?: boolean;
  isDisabledWithSwitch?: boolean;
  disabledSwitchMessage?: string;
  integrationId?: string;
  integrationEnvironmentId?: string;
  tooltip?: ReactNode;
  isRejected?: boolean;
  savedValue?: string;
}) {
  if (credential.type === 'pushResources') {
    return (
      <PushResources
        credential={credential}
        integrationId={integrationId}
        integrationEnvironmentId={integrationEnvironmentId}
      />
    );
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
    return (
      <TextareaInput
        credential={credential}
        field={field}
        isReadOnly={isReadOnly}
        tooltip={tooltip}
        savedValue={savedValue}
      />
    );
  }

  // A setting the API returns masked (the webhook signing key) is a saved secret too.
  if (isSecureCredential(credential) || !!savedValue || isMaskedSecret(field.value)) {
    return (
      <SecretInputControl
        credential={credential}
        field={field}
        isReadOnly={isReadOnly}
        tooltip={tooltip}
        hasError={!!fieldState.error || isRejected}
        savedValue={savedValue}
      />
    );
  }

  return (
    <TextInputControl
      credential={credential}
      field={field}
      fieldState={fieldState}
      isReadOnly={isReadOnly}
      tooltip={tooltip}
    />
  );
}

export function CredentialSection({
  credential,
  control,
  isReadOnly,
  isDisabledWithSwitch,
  disabledSwitchMessage,
  name = 'credentials',
  integrationId,
  rejectedMessage,
}: {
  credential: IConfigCredential;
  control: Control<IntegrationFormData>;
  isReadOnly?: boolean;
  isDisabledWithSwitch?: boolean;
  disabledSwitchMessage?: string;
  name?: 'credentials' | 'configurations';
  integrationId?: string;
  /** The provider rejected this stored secret; shown until the user types a new one. */
  rejectedMessage?: string;
}) {
  const integrationEnvironmentId = useWatch({ control, name: 'environmentId' });

  return (
    <FormField
      key={`${credential.key}-${integrationId || 'no-id'}`}
      control={control}
      name={`${name}.${credential.key}`}
      rules={{
        required: credential.required ? `${credential.displayName} is required` : false,
        // A saved secret arrives masked, so there is no value to check until it is replaced.
        validate: (value) => {
          if (isMaskedSecret(value)) return true;

          const pattern = credential.validation?.pattern;
          if (pattern && typeof value === 'string' && value !== '' && !pattern.test(value)) {
            return credential.validation?.message || 'Invalid format';
          }

          return credential.validation?.validate?.(value) ?? true;
        },
      }}
      render={({ field, fieldState, formState }) => {
        const isRejected = !!rejectedMessage && !fieldState.isDirty;
        const defaultValue = formState.defaultValues?.[name]?.[credential.key];
        const savedValue = isMaskedSecret(defaultValue) ? defaultValue : undefined;

        return (
          <FormItem className="mb-2">
            <InputControl
              credential={credential}
              field={field}
              fieldState={fieldState}
              isReadOnly={isReadOnly}
              isDisabledWithSwitch={isDisabledWithSwitch}
              disabledSwitchMessage={disabledSwitchMessage}
              integrationId={integrationId}
              integrationEnvironmentId={integrationEnvironmentId}
              tooltip={getCredentialTooltip(credential)}
              isRejected={isRejected}
              savedValue={savedValue}
            />

            {/* The explanation sits behind the label's "i"; only a validation error shows under the field. */}
            {fieldState.error?.message && <FormMessage>{fieldState.error.message}</FormMessage>}
            {!fieldState.error && isRejected && <p className="text-paragraph-xs text-error-base">{rejectedMessage}</p>}
          </FormItem>
        );
      }}
    />
  );
}

import {
  ChannelTypeEnum,
  CredentialsKeyEnum,
  IConfigCredentials,
  IProviderConfig,
  ProvidersIdEnum,
} from '@novu/shared';
import { Control, useWatch } from 'react-hook-form';
import { Input } from '@/components/primitives/input';
import { SecretInput } from '@/components/primitives/secret-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Switch } from '@/components/primitives/switch';
import { Textarea } from '@/components/primitives/textarea';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/primitives/form/form';
import { API_HOSTNAME } from '../../../config';
import { useEnvironment } from '../../../context/environment/hooks';

type IntegrationFormData = {
  name: string;
  identifier: string;
  credentials: Record<string, string>;
  active: boolean;
  check: boolean;
  primary: boolean;
  environmentId: string;
};

type CredentialsSectionProps = {
  provider?: IProviderConfig;
  control: Control<IntegrationFormData>;
  isReadOnly?: boolean;
};

const SECURE_CREDENTIALS = [
  CredentialsKeyEnum.ApiKey,
  CredentialsKeyEnum.ApiToken,
  CredentialsKeyEnum.SecretKey,
  CredentialsKeyEnum.Token,
  CredentialsKeyEnum.Password,
  CredentialsKeyEnum.ServiceAccount,
];

type CredentialFieldProps = {
  credential: IConfigCredentials;
  control: Control<IntegrationFormData>;
  isReadOnly?: boolean;
  keyName?: string;
  provider?: IProviderConfig;
};

function generateInboundWebhookUrl(
  environmentId: string,
  channelType: ChannelTypeEnum,
  providerOrIntegrationId: ProvidersIdEnum
): string {
  const baseUrl = API_HOSTNAME ?? 'https://api.novu.co';
  return `${baseUrl}/v2/inbound-webhooks/environments/${environmentId}/channels/${channelType}/providers/${providerOrIntegrationId}`;
}

function CredentialField({ credential, control, isReadOnly, keyName, provider }: CredentialFieldProps) {
  const fieldKey = keyName || credential.key;
  const { currentEnvironment } = useEnvironment();

  const inboundWebhookUrl =
    credential.key === CredentialsKeyEnum.InboundWebhookUrl
      ? generateInboundWebhookUrl(
          // biome-ignore lint/style/noNonNullAssertion: <explanation> x
          currentEnvironment!._id,
          provider?.channel as ChannelTypeEnum,
          provider?.id as ProvidersIdEnum
        )
      : '';

  return (
    <FormField
      key={fieldKey}
      control={control}
      name={`credentials.${fieldKey}`}
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
      render={({ field, fieldState }) => {
        let inputComponent: JSX.Element;

        if (credential.type === 'switch') {
          inputComponent = (
            <FormControl>
              <Switch
                id={fieldKey}
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
                disabled={isReadOnly}
              />
            </FormControl>
          );
        } else if (credential.type === 'dropdown' && credential.dropdown) {
          inputComponent = (
            <FormControl>
              <Select value={field.value || ''} onValueChange={field.onChange} disabled={isReadOnly}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${credential.displayName.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {credential.dropdown.map((option: { value: string | null; name: string }) => (
                    <SelectItem key={option.value || ''} value={option.value || ''}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
          );
        } else if (credential.type === 'textarea') {
          inputComponent = (
            <FormControl>
              <Textarea
                id={fieldKey}
                placeholder={`Enter ${credential.displayName.toLowerCase()}`}
                value={field.value || ''}
                onChange={field.onChange}
                rows={7}
                disabled={isReadOnly}
              />
            </FormControl>
          );
        } else if (SECURE_CREDENTIALS.includes(credential.key as CredentialsKeyEnum)) {
          inputComponent = (
            <FormControl>
              <SecretInput
                id={fieldKey}
                placeholder={`Enter ${credential.displayName.toLowerCase()}`}
                value={field.value || ''}
                onChange={field.onChange}
                disabled={isReadOnly}
              />
            </FormControl>
          );
        } else {
          // Default input component
          inputComponent = (
            <FormControl>
              <Input
                size={'md'}
                id={fieldKey}
                type="text"
                placeholder={`Enter ${credential.displayName.toLowerCase()}`}
                {...field}
                value={field.value || inboundWebhookUrl || ''}
                hasError={!!fieldState.error}
                disabled={isReadOnly}
              />
            </FormControl>
          );
        }

        return (
          <FormItem className="mb-2">
            {credential.type === 'switch' ? (
              <div className="flex items-center justify-between gap-2">
                <FormLabel htmlFor={fieldKey} optional={!credential.required} className="mb-0">
                  {credential.displayName}
                </FormLabel>
                {inputComponent}
              </div>
            ) : (
              <>
                <FormLabel htmlFor={fieldKey} optional={!credential.required}>
                  {credential.displayName}
                </FormLabel>
                {inputComponent}
              </>
            )}

            <FormMessage>{fieldState.error?.message || credential.description}</FormMessage>
          </FormItem>
        );
      }}
    />
  );
}

type GroupedCredential = IConfigCredentials & {
  subKey: string;
  originalKey: string;
  title?: string;
  description?: string;
};

type CredentialGroup = {
  enableToggle?: GroupedCredential;
  nestedCredentials: GroupedCredential[];
  title?: string;
  description?: string;
};

type CredentialGroupComponentProps = {
  group: CredentialGroup;
  control: Control<IntegrationFormData>;
  isReadOnly?: boolean;
  provider?: IProviderConfig;
};

function CredentialGroupComponent({ group, control, isReadOnly, provider }: CredentialGroupComponentProps) {
  // Always call useWatch to avoid conditional hook call
  const toggleFieldName = group.enableToggle
    ? (`credentials.${group.enableToggle.originalKey}` as const)
    : ('credentials.__dummy__' as const);

  const watchedValue = useWatch({
    control,
    name: toggleFieldName,
  });

  // Return null if no enable toggle
  if (!group.enableToggle) {
    return null;
  }

  const isEnabled = Boolean(watchedValue && watchedValue !== 'false');

  return (
    <div>
      {/* Render the enable toggle */}
      <CredentialField
        key={group.enableToggle.originalKey}
        credential={group.enableToggle}
        control={control}
        isReadOnly={isReadOnly}
        keyName={group.enableToggle.originalKey}
        provider={provider}
      />

      {/* Render nested credentials only when enabled */}
      {isEnabled && group.nestedCredentials.length > 0 && (
        <div className="relative mt-3 space-y-2 pl-6">
          {/* Vertical line indicator */}
          <div className="absolute left-3 top-0 bottom-0 w-px bg-neutral-alpha-200" />
          {group.nestedCredentials.map((credential) => (
            <CredentialField
              key={credential.originalKey}
              credential={credential}
              control={control}
              isReadOnly={isReadOnly}
              keyName={credential.originalKey}
              provider={provider}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CredentialsSection({ provider, control, isReadOnly }: CredentialsSectionProps) {
  // Group credentials (prefix before '_') or individual keys
  const groupedCredentials = provider?.credentials?.reduce(
    (acc, credential) => {
      const colonIndex = credential.key.split('_');

      if (colonIndex.length > 1) {
        // Has group prefix
        const group = colonIndex[0];
        const subKey = colonIndex[1];

        if (!acc.groups[group]) {
          acc.groups[group] = {
            enableToggle: undefined,
            nestedCredentials: [],
            title: undefined,
            description: undefined,
          };
        }

        const groupedCredential: GroupedCredential = {
          ...credential,
          subKey,
          originalKey: credential.key,
          description: credential.description,
        };

        // Check if this is an enable toggle (ends with 'enabled')
        if (subKey === 'enabled' && credential.type === 'switch') {
          acc.groups[group].enableToggle = groupedCredential;
          acc.groups[group].description = credential.description;
        } else {
          acc.groups[group].nestedCredentials.push(groupedCredential);
        }
      } else {
        // Individual credential
        acc.individual.push(credential);
      }

      return acc;
    },
    {
      groups: {} as Record<string, CredentialGroup>,
      individual: [] as IConfigCredentials[],
    }
  ) || { groups: {}, individual: [] };

  return (
    <div className="border-neutral-alpha-200 bg-background text-foreground-600 mx-0 mt-0 flex flex-col gap-2 rounded-lg border p-3">
      {/* Render individual credentials */}
      {groupedCredentials.individual.map((credential) => (
        <CredentialField key={credential.key} credential={credential} control={control} isReadOnly={isReadOnly} />
      ))}

      {/* Render grouped credentials with enable toggles */}
      {Object.entries(groupedCredentials.groups).map(([groupKey, group]) => (
        <CredentialGroupComponent
          key={groupKey}
          group={group}
          control={control}
          isReadOnly={isReadOnly}
          provider={provider}
        />
      ))}
    </div>
  );
}

import {
  CredentialsKeyEnum,
  EmailProviderIdEnum,
  type IConfigCredential,
  type IProviderConfig,
  SmsProviderIdEnum,
} from '@novu/shared';
import { type ClipboardEvent, useId, useState } from 'react';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { RiInformationFill } from 'react-icons/ri';
import { SetupButton, SetupStep, SetupStepperRail } from '@/components/agents/setup-guide-primitives';
import { FormControl, FormField, FormItem } from '@/components/primitives/form/form';
import { Switch } from '@/components/primitives/switch';
import type { IntegrationFormData } from '../types';
import { CredentialSection } from './credential-section';
import {
  isLikelyResendCredentialsBlock,
  parseResendCredentials,
  type ResendCredentialField,
} from './parse-resend-credentials';
import { SegmentedControl } from './provider-setup-layout';
import { ACTIVITY_TRACKING_ENABLER, configurationToCredential, type GuidedSetupProviderId } from './utils/helpers';

const SIGNING_KEY = 'inboundWebhookSigningKey';
/** Stands in for a choice without a value; radio items need one. */
const NO_VALUE = '__none__';

type CredentialsGuide = {
  /** Step 1: where the user gets the credentials for Novu. */
  sourceStep: {
    title: string;
    /** Takes the environment's name, which the key is named after. */
    description: (keyName: string) => string;
    buttonLabel: string;
    url: string;
  };
  credentialsDescription: string;
  /** Step 3, for providers whose delivery webhook Novu can track. */
  tracking?: { description: string; switchDescription: string };
  /** The credential fields in the order the guide shows them; the rest follow. */
  fieldOrder?: CredentialsKeyEnum[];
  /** Placeholders and descriptions that fit this guide better than the generic ones. */
  fieldOverrides?: Partial<Record<string, Partial<IConfigCredential>>>;
  /** Short lists of choices shown as a segmented control instead of a dropdown. */
  segmentedFields?: CredentialsKeyEnum[];
  /** Fills in the fields from a pasted block of environment variables. */
  readsPastedEnv?: boolean;
};

const SENDER_OVERRIDES: Partial<Record<string, Partial<IConfigCredential>>> = {
  [CredentialsKeyEnum.From]: { placeholder: 'hello@acme.com', description: undefined },
  [CredentialsKeyEnum.SenderName]: { placeholder: 'Acme', description: undefined },
};

function dedicatedApiKeyStep(providerName: string, keyAccess: string, url: string): CredentialsGuide['sourceStep'] {
  return {
    title: 'Create a dedicated API key for Novu',
    description: (keyName) =>
      `Name it “${keyName}” and give it ${keyAccess} access only. A separate key can be rotated or revoked without touching your app.`,
    buttonLabel: `Open ${providerName} API keys`,
    url,
  };
}

const GUIDES: Record<GuidedSetupProviderId, CredentialsGuide> = {
  [EmailProviderIdEnum.Resend]: {
    sourceStep: dedicatedApiKeyStep('Resend', 'Sending', 'https://resend.com/api-keys'),
    credentialsDescription: 'The From address must use a domain you’ve verified in Resend.',
    tracking: {
      description:
        'After you connect, Novu gives you a webhook URL to add in Resend. Delivered, opened, clicked and bounced then show in the Activity Feed.',
      switchDescription: 'Shows delivery events sent by the provider’s webhook.',
    },
    fieldOverrides: SENDER_OVERRIDES,
    readsPastedEnv: true,
  },
  [EmailProviderIdEnum.SendGrid]: {
    sourceStep: dedicatedApiKeyStep('SendGrid', 'Mail Send', 'https://app.sendgrid.com/settings/api_keys'),
    credentialsDescription: 'Use EU only if your SendGrid account is on the EU region.',
    tracking: {
      description:
        'After you connect, Novu adds the delivery webhook in SendGrid with your API key. Delivered, opened, clicked and bounced then show in the Activity Feed. If the key can’t, you get a URL to paste.',
      switchDescription: 'Novu sets up the provider’s delivery webhook for you.',
    },
    fieldOrder: [
      CredentialsKeyEnum.ApiKey,
      CredentialsKeyEnum.From,
      CredentialsKeyEnum.SenderName,
      CredentialsKeyEnum.Region,
      CredentialsKeyEnum.IpPoolName,
    ],
    fieldOverrides: {
      ...SENDER_OVERRIDES,
      [CredentialsKeyEnum.IpPoolName]: { placeholder: 'transactional' },
    },
    segmentedFields: [CredentialsKeyEnum.Region],
  },
  [SmsProviderIdEnum.Twilio]: {
    sourceStep: {
      title: 'Copy your credentials from Twilio',
      description: (keyName) =>
        `Create an API key named “${keyName}” in the Twilio Console instead of reusing your Auth token. Use an SMS-capable number as From.`,
      buttonLabel: 'Open Twilio Console',
      url: 'https://console.twilio.com/us1/account/keys-credentials/api-keys',
    },
    credentialsDescription: 'Choose API key as the method, then paste the API key SID and secret you created for Novu.',
    fieldOverrides: {
      [CredentialsKeyEnum.AccountSid]: { placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      [CredentialsKeyEnum.AuthMethod]: { description: undefined },
      // The region keeps its hint: EU accounts need credentials created in that region.
      [CredentialsKeyEnum.From]: { placeholder: '+1 415 555 0132' },
    },
    segmentedFields: [CredentialsKeyEnum.AuthMethod],
  },
};

const PASTED_FIELD_LABELS: Record<ResendCredentialField, string> = {
  [CredentialsKeyEnum.ApiKey]: 'API Key',
  [CredentialsKeyEnum.From]: 'From email address',
  [CredentialsKeyEnum.SenderName]: 'Sender name',
};
const PASTED_FIELD_ORDER = Object.keys(PASTED_FIELD_LABELS) as ResendCredentialField[];

function formatList(items: string[]): string {
  if (items.length <= 1) return items.join('');

  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function orderCredentials(credentials: IConfigCredential[], order?: CredentialsKeyEnum[]) {
  if (!order) return credentials;

  const rank = (key: string) => {
    const index = order.indexOf(key as CredentialsKeyEnum);

    return index === -1 ? order.length : index;
  };

  return [...credentials].sort((a, b) => rank(a.key) - rank(b.key));
}

type GuidedCredentialsSetupProps = {
  providerId: GuidedSetupProviderId;
  provider: IProviderConfig;
  credentials: IConfigCredential[];
  control: Control<IntegrationFormData>;
  setValue: UseFormSetValue<IntegrationFormData>;
  /** The environment the integration is created in, which names the API key. */
  environmentName?: string;
  /** False hides the tracking step. */
  isTrackingAvailable: boolean;
  isTrackingEnabled: boolean;
  isReadOnly?: boolean;
};

/**
 * Setup for a provider that connects with credentials: get them for Novu in the provider, enter them, and, where
 * Novu can track delivery, choose whether to through the provider's webhook once the integration is created.
 */
export function GuidedCredentialsSetup({
  providerId,
  provider,
  credentials,
  control,
  setValue,
  environmentName,
  isTrackingAvailable,
  isTrackingEnabled,
  isReadOnly,
}: GuidedCredentialsSetupProps) {
  const guide = GUIDES[providerId];
  const [foundFields, setFoundFields] = useState<ResendCredentialField[]>([]);

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (isReadOnly || !guide.readsPastedEnv) return;

    const text = event.clipboardData.getData('text/plain');
    if (!isLikelyResendCredentialsBlock(text)) return;

    const parsed = parseResendCredentials(text);
    const found = PASTED_FIELD_ORDER.filter((key) => parsed[key] !== undefined);
    if (found.length === 0) return;

    // Keeps the whole block out of the field that happened to have focus.
    event.preventDefault();
    event.stopPropagation();

    for (const key of found) {
      const value = parsed[key];
      if (value === undefined) continue;
      setValue(`credentials.${key}`, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    }
    setFoundFields(found);
  };

  const trackingGroup =
    guide.tracking && isTrackingAvailable
      ? provider.configurations?.find((group) => group.groupType === 'inboundWebhook')
      : undefined;
  const signingKeyConfig = trackingGroup?.configurations.find((config) => config.key === SIGNING_KEY);

  return (
    <SetupStepperRail className="-ml-3 pb-4">
      <SetupStep
        index={1}
        status="current"
        title={guide.sourceStep.title}
        description={guide.sourceStep.description(`Novu – ${environmentName ?? 'Development'}`)}
        extraContent={<SetupButton href={guide.sourceStep.url}>{guide.sourceStep.buttonLabel}</SetupButton>}
      />
      <SetupStep
        index={2}
        status="current"
        title="Enter your credentials"
        description={guide.credentialsDescription}
        extraContent={
          <div className="flex flex-col gap-3" onPasteCapture={handlePaste}>
            {orderCredentials(credentials, guide.fieldOrder).map((credential) => {
              const shown = { ...credential, ...guide.fieldOverrides?.[credential.key] };

              return guide.segmentedFields?.includes(credential.key as CredentialsKeyEnum) ? (
                <ChoiceField key={credential.key} credential={shown} control={control} isReadOnly={isReadOnly} />
              ) : (
                <CredentialSection key={credential.key} credential={shown} control={control} isReadOnly={isReadOnly} />
              );
            })}
            {foundFields.length > 0 && (
              <p className="text-paragraph-xs text-text-sub flex items-center gap-1" aria-live="polite">
                <RiInformationFill className="text-text-soft size-4 shrink-0" />
                Found {formatList(foundFields.map((key) => PASTED_FIELD_LABELS[key]))}
              </p>
            )}
          </div>
        }
      />
      {guide.tracking && trackingGroup && (
        <SetupStep
          index={3}
          status="current"
          title="Track delivery and opens (optional)"
          description={guide.tracking.description}
          extraContent={
            <div className="flex flex-col gap-4">
              <TrackingToggle
                control={control}
                description={guide.tracking.switchDescription}
                isReadOnly={isReadOnly}
              />
              {isTrackingEnabled && signingKeyConfig && (
                <CredentialSection
                  name="configurations"
                  credential={{
                    ...configurationToCredential(signingKeyConfig),
                    placeholder: 'Paste the verification key from the provider',
                  }}
                  control={control}
                  isReadOnly={isReadOnly}
                />
              )}
            </div>
          }
        />
      )}
    </SetupStepperRail>
  );
}

/**
 * A short list of choices, such as SendGrid's region or Twilio's authentication method, as a segmented control.
 * An option without a value (Twilio's Auth token) is stored as an empty string, as the dropdown stores it; unset
 * shows the default choice.
 */
function ChoiceField({
  credential,
  control,
  isReadOnly,
}: {
  credential: IConfigCredential;
  control: Control<IntegrationFormData>;
  isReadOnly?: boolean;
}) {
  const labelId = useId();
  const options = (credential.dropdown ?? []).map((option) => ({
    value: typeof option.value === 'string' && option.value ? option.value : NO_VALUE,
    label: option.name,
  }));
  const fallback = typeof credential.value === 'string' && credential.value ? credential.value : NO_VALUE;

  return (
    <FormField
      control={control}
      name={`credentials.${credential.key}`}
      render={({ field }) => (
        <FormItem className="flex flex-col gap-1">
          <span id={labelId} className="text-label-xs text-text-sub">
            {credential.displayName}
            {credential.required && <span className="text-primary-base"> *</span>}
          </span>
          <FormControl>
            <SegmentedControl
              aria-labelledby={labelId}
              value={typeof field.value === 'string' && field.value ? field.value : fallback}
              onValueChange={(value) => field.onChange(value === NO_VALUE ? '' : value)}
              options={options}
              disabled={isReadOnly}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

function TrackingToggle({
  control,
  description,
  isReadOnly,
}: {
  control: Control<IntegrationFormData>;
  description: string;
  isReadOnly?: boolean;
}) {
  const switchId = useId();

  return (
    <FormField
      control={control}
      name={`configurations.${ACTIVITY_TRACKING_ENABLER}`}
      render={({ field }) => (
        <FormItem className="flex items-center gap-2 py-1">
          <label htmlFor={switchId} className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-label-sm text-text-strong">Email Activity Tracking</span>
            <span className="text-paragraph-xs text-text-sub">{description}</span>
          </label>
          <FormControl>
            <Switch
              id={switchId}
              checked={Boolean(field.value) && field.value !== 'false'}
              onCheckedChange={field.onChange}
              disabled={isReadOnly}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

import { CredentialsKeyEnum, type IConfigCredential, type IProviderConfig } from '@novu/shared';
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
import { configurationToCredential, RESEND_TRACKING_ENABLER } from './utils/helpers';

const RESEND_API_KEYS_URL = 'https://resend.com/api-keys';
const RESEND_SIGNING_KEY = 'inboundWebhookSigningKey';

/** What the credential fields show in this guide, in place of their generic placeholders and descriptions. */
const FIELD_OVERRIDES: Partial<Record<string, Partial<IConfigCredential>>> = {
  [CredentialsKeyEnum.From]: { placeholder: 'hello@acme.com', description: undefined },
  [CredentialsKeyEnum.SenderName]: { placeholder: 'Acme', description: undefined },
};

const FIELD_LABELS: Record<ResendCredentialField, string> = {
  [CredentialsKeyEnum.ApiKey]: 'API Key',
  [CredentialsKeyEnum.From]: 'From email address',
  [CredentialsKeyEnum.SenderName]: 'Sender name',
};
const FIELD_ORDER = Object.keys(FIELD_LABELS) as ResendCredentialField[];

function formatList(items: string[]): string {
  if (items.length <= 1) return items.join('');

  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

type ResendSetupProps = {
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
 * Setup for Resend: create a sending-only API key, enter it with the sender, and choose whether to track delivery
 * through Resend's webhook once the integration is created. Pasting a block of environment variables into any
 * credential field fills in everything Novu finds in it.
 */
export function ResendSetup({
  provider,
  credentials,
  control,
  setValue,
  environmentName,
  isTrackingAvailable,
  isTrackingEnabled,
  isReadOnly,
}: ResendSetupProps) {
  const [foundFields, setFoundFields] = useState<ResendCredentialField[]>([]);

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (isReadOnly) return;

    const text = event.clipboardData.getData('text/plain');
    if (!isLikelyResendCredentialsBlock(text)) return;

    const parsed = parseResendCredentials(text);
    const found = FIELD_ORDER.filter((key) => parsed[key] !== undefined);
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

  const trackingGroup = isTrackingAvailable
    ? provider.configurations?.find((group) => group.groupType === 'inboundWebhook')
    : undefined;
  const signingKeyConfig = trackingGroup?.configurations.find((config) => config.key === RESEND_SIGNING_KEY);

  return (
    <SetupStepperRail className="-ml-3 pb-4">
      <SetupStep
        index={1}
        status="current"
        title="Create a dedicated API key for Novu"
        description={`Name it “Novu – ${environmentName ?? 'Development'}” and give it Sending access only. A separate key can be rotated or revoked without touching your app.`}
        extraContent={<SetupButton href={RESEND_API_KEYS_URL}>Open Resend API keys</SetupButton>}
      />
      <SetupStep
        index={2}
        status="current"
        title="Enter your credentials"
        description="The From address must use a domain you’ve verified in Resend."
        extraContent={
          <div className="flex flex-col gap-3" onPasteCapture={handlePaste}>
            {credentials.map((credential) => (
              <CredentialSection
                key={credential.key}
                credential={{ ...credential, ...FIELD_OVERRIDES[credential.key] }}
                control={control}
                isReadOnly={isReadOnly}
              />
            ))}
            {foundFields.length > 0 && (
              <p className="text-paragraph-xs text-text-sub flex items-center gap-1" aria-live="polite">
                <RiInformationFill className="text-text-soft size-4 shrink-0" />
                Found {formatList(foundFields.map((key) => FIELD_LABELS[key]))}
              </p>
            )}
          </div>
        }
      />
      {trackingGroup && (
        <SetupStep
          index={3}
          status="current"
          title="Track delivery and opens (optional)"
          description="After you connect, Novu gives you a webhook URL to add in Resend. Delivered, opened, clicked and bounced then show in the Activity Feed."
          extraContent={
            <div className="flex flex-col gap-4">
              <TrackingToggle control={control} isReadOnly={isReadOnly} />
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

function TrackingToggle({ control, isReadOnly }: { control: Control<IntegrationFormData>; isReadOnly?: boolean }) {
  const switchId = useId();

  return (
    <FormField
      control={control}
      name={`configurations.${RESEND_TRACKING_ENABLER}`}
      render={({ field }) => (
        <FormItem className="flex items-center gap-2 py-1">
          <label htmlFor={switchId} className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-label-sm text-text-strong">Email Activity Tracking</span>
            <span className="text-paragraph-xs text-text-sub">
              Shows delivery events sent by the provider’s webhook.
            </span>
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

import {
  CredentialsKeyEnum,
  EmailProviderIdEnum,
  type IConfigCredential,
  type IProviderConfig,
  PushProviderIdEnum,
  SmsProviderIdEnum,
} from '@novu/shared';
import { type ClipboardEvent, useId, useState } from 'react';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { RiCheckLine, RiFileCopyLine, RiInformationFill } from 'react-icons/ri';
import { SetupButton, SetupStep, SetupStepperRail } from '@/components/agents/setup-guide-primitives';
import { FormControl, FormField, FormItem } from '@/components/primitives/form/form';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import type { IntegrationFormData } from '../types';
import { ApnsEnvironmentField, ApnsKeyPaste, ApnsKeyUpload } from './apns-key-fields';
import { AwsAccessKeyUpload, AwsRegionField } from './aws-access-key-fields';
import { CredentialSection } from './credential-section';
import { isLikelyAwsCredentialsBlock, parseAwsCredentials } from './parse-aws-credentials';
import { isLikelyResendCredentialsBlock, parseResendCredentials } from './parse-resend-credentials';
import { type ProviderSetupMode, SegmentedControl } from './provider-setup-layout';
import { ServiceAccountPaste, ServiceAccountUpload } from './service-account-fields';
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
    /** Text the user needs in the provider, such as a permissions policy, behind a copy button. */
    copyable?: { label: string; value: string };
  };
  /** Step 2's title; "Enter your credentials" when left out. */
  credentialsTitle?: string;
  credentialsDescription: string;
  /**
   * Quick setup's step 2, for providers whose credentials come as a file: upload it instead of pasting it. The file
   * fills `fileKeys`; the guide's other fields follow it.
   */
  fileUpload?: {
    kind: 'serviceAccount' | 'apnsKey' | 'awsAccessKey';
    /** The provider has this one way to set up, without the Quick setup / Manual switch: the upload types too. */
    isOnlyMode?: boolean;
    title: string;
    description: string;
    fileKeys: CredentialsKeyEnum[];
  };
  /** Step 3, for providers whose delivery webhook Novu can track. */
  tracking?: {
    description: string;
    switchLabel: string;
    switchDescription: string;
    /** Credentials only tracking needs: Quick setup shows them here once the switch is on, not in step 2. */
    quickSetupFields?: CredentialsKeyEnum[];
  };
  /** The credential fields in the order the guide shows them; the rest follow. */
  fieldOrder?: CredentialsKeyEnum[];
  /** Placeholders and descriptions that fit this guide better than the generic ones. */
  fieldOverrides?: Partial<Record<string, Partial<IConfigCredential>>>;
  /** Short lists of choices shown as a segmented control instead of a dropdown. */
  segmentedFields?: CredentialsKeyEnum[];
  /** Fills in the fields from a pasted block, such as environment variables or a key file's contents. */
  pasted?: PastedCredentials;
};

type PastedCredentials = {
  /** True for a block worth reading; a bare value is left for the field it was pasted into. */
  isBlock: (text: string) => boolean;
  parse: (text: string) => Partial<Record<string, string>>;
  /** The fields a block can fill, in the order they are named back to the user. */
  labels: Partial<Record<CredentialsKeyEnum, string>>;
};

const RESEND_PASTED: PastedCredentials = {
  isBlock: isLikelyResendCredentialsBlock,
  parse: parseResendCredentials,
  labels: {
    [CredentialsKeyEnum.ApiKey]: 'API Key',
    [CredentialsKeyEnum.From]: 'From email address',
    [CredentialsKeyEnum.SenderName]: 'Sender name',
  },
};

const AWS_PASTED: PastedCredentials = {
  isBlock: isLikelyAwsCredentialsBlock,
  parse: parseAwsCredentials,
  labels: {
    [CredentialsKeyEnum.ApiKey]: 'Access key ID',
    [CredentialsKeyEnum.SecretKey]: 'Secret access key',
    [CredentialsKeyEnum.Region]: 'Region',
  },
};

/** What the IAM user Novu sends with may do: send email, and nothing else in the account. */
const SES_SEND_POLICY = JSON.stringify(
  {
    Version: '2012-10-17',
    Statement: [{ Effect: 'Allow', Action: ['ses:SendEmail', 'ses:SendRawEmail'], Resource: '*' }],
  },
  null,
  2
);

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
      switchLabel: 'Email Activity Tracking',
      switchDescription: 'Shows delivery events sent by the provider’s webhook.',
    },
    fieldOverrides: SENDER_OVERRIDES,
    pasted: RESEND_PASTED,
  },
  [EmailProviderIdEnum.SendGrid]: {
    sourceStep: dedicatedApiKeyStep('SendGrid', 'Mail Send', 'https://app.sendgrid.com/settings/api_keys'),
    credentialsDescription: 'Use EU only if your SendGrid account is on the EU region.',
    tracking: {
      description:
        'After you connect, Novu adds the delivery webhook in SendGrid with your API key. Delivered, opened, clicked and bounced then show in the Activity Feed. If the key can’t, you get a URL to paste.',
      switchLabel: 'Email Activity Tracking',
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
  [EmailProviderIdEnum.SES]: {
    sourceStep: {
      title: 'Create an IAM user for Novu',
      description: (keyName) =>
        `In IAM, create a user named “${keyName}” and attach the send-only policy as an inline policy. Then, under Security credentials, create an access key and download the .csv file.`,
      buttonLabel: 'Open AWS IAM',
      url: 'https://console.aws.amazon.com/iam/home#/users/create',
      copyable: { label: 'Copy send-only policy', value: SES_SEND_POLICY },
    },
    credentialsDescription: 'The From address must be an identity verified in SES in the region you choose.',
    fileUpload: {
      kind: 'awsAccessKey',
      isOnlyMode: true,
      title: 'Add the access key',
      description:
        'Drop the .csv file AWS downloaded; Novu reads it in your browser. The From address must be an identity verified in SES in the region you choose. A new SES account is in the sandbox and sends only to verified addresses.',
      fileKeys: [CredentialsKeyEnum.ApiKey, CredentialsKeyEnum.SecretKey],
    },
    tracking: {
      description:
        'SES reports delivery through a configuration set and an SNS topic. After you connect, Novu gives you a webhook URL to subscribe the topic to. Delivered, opened, clicked and bounced then show in the Activity Feed.',
      switchLabel: 'Email Activity Tracking',
      switchDescription: 'Shows delivery events sent through your SNS topic.',
      quickSetupFields: [CredentialsKeyEnum.ConfigurationSetName],
    },
    fieldOrder: [
      CredentialsKeyEnum.ApiKey,
      CredentialsKeyEnum.SecretKey,
      CredentialsKeyEnum.Region,
      CredentialsKeyEnum.From,
      CredentialsKeyEnum.SenderName,
      CredentialsKeyEnum.ConfigurationSetName,
    ],
    fieldOverrides: {
      ...SENDER_OVERRIDES,
      [CredentialsKeyEnum.ApiKey]: { placeholder: 'AKIA…' },
      [CredentialsKeyEnum.Region]: { placeholder: 'us-east-1' },
      [CredentialsKeyEnum.ConfigurationSetName]: { placeholder: 'novu-tracking' },
    },
    pasted: AWS_PASTED,
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
  [PushProviderIdEnum.FCM]: {
    sourceStep: {
      title: 'Generate a private key in Firebase',
      description: () =>
        'In Project settings, open Service accounts and click Generate new private key. A JSON file downloads.',
      buttonLabel: 'Open Firebase console',
      url: 'https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk',
    },
    credentialsTitle: 'Paste the service account JSON',
    credentialsDescription: 'Paste the entire file, including the private key.',
    fileUpload: {
      kind: 'serviceAccount',
      title: 'Upload the JSON file',
      description: 'Drop the file here. Novu reads the project from it.',
      fileKeys: [CredentialsKeyEnum.ServiceAccount],
    },
    tracking: {
      description:
        'Every push carries __nvMessageId. After you connect, send delivered and opened events from your app with the Environment ID and Integration ID shown on the integration, and they show in the Activity Feed.',
      switchLabel: 'Push Activity Tracking',
      switchDescription: 'Receive push events to track delivery and opens.',
    },
  },
  [PushProviderIdEnum.APNS]: {
    sourceStep: {
      title: 'Create an APNs auth key',
      description: () =>
        'In Apple Developer, open Keys and create a key with Apple Push Notifications service. Apple lets you download it once.',
      buttonLabel: 'Open Apple Developer',
      url: 'https://developer.apple.com/account/resources/authkeys/list',
    },
    credentialsDescription: 'Paste the contents of the .p8 file, including the BEGIN and END lines.',
    fileUpload: {
      kind: 'apnsKey',
      title: 'Upload the .p8 key',
      description: 'Novu reads the Key ID from the file name. Add your Team ID and the app’s Bundle ID.',
      fileKeys: [CredentialsKeyEnum.SecretKey, CredentialsKeyEnum.ApiKey],
    },
    tracking: {
      description:
        'Every push carries __nvMessageId. After you connect, send delivered and opened events from your app with the Environment ID and Integration ID shown on the integration, and they show in the Activity Feed.',
      switchLabel: 'Push Activity Tracking',
      switchDescription: 'Receive push events to track delivery and opens.',
    },
    fieldOrder: [
      CredentialsKeyEnum.SecretKey,
      CredentialsKeyEnum.ApiKey,
      CredentialsKeyEnum.ProjectName,
      CredentialsKeyEnum.ApplicationId,
      CredentialsKeyEnum.Secure,
    ],
    fieldOverrides: {
      [CredentialsKeyEnum.ApiKey]: { placeholder: '7KQ2M4X9PL' },
      [CredentialsKeyEnum.ProjectName]: { placeholder: 'A1B2C3D4E5' },
      [CredentialsKeyEnum.ApplicationId]: { placeholder: 'com.acme.app' },
      [CredentialsKeyEnum.Secure]: { displayName: 'Environment' },
    },
  },
};

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
  /** For providers with Quick setup / Manual: Quick setup takes a file where Manual takes the pasted text. */
  setupMode?: ProviderSetupMode;
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
  setupMode,
  isReadOnly,
}: GuidedCredentialsSetupProps) {
  const guide = GUIDES[providerId];
  const { pasted } = guide;
  const [foundFields, setFoundFields] = useState<CredentialsKeyEnum[]>([]);

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (isReadOnly || !pasted) return;

    const text = event.clipboardData.getData('text/plain');
    if (!pasted.isBlock(text)) return;

    const parsed = pasted.parse(text);
    const found = Object.values(CredentialsKeyEnum).filter(
      (key) => pasted.labels[key] !== undefined && parsed[key] !== undefined
    );
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

  const foundNote = pasted && foundFields.length > 0 && (
    <p className="text-paragraph-xs text-text-sub flex items-center gap-1" aria-live="polite">
      <RiInformationFill className="text-text-soft size-4 shrink-0" />
      Found {formatList(foundFields.flatMap((key) => pasted.labels[key] ?? []))}
    </p>
  );

  const trackingGroup =
    guide.tracking && isTrackingAvailable
      ? provider.configurations?.find((group) => group.groupType === 'inboundWebhook')
      : undefined;
  const signingKeyConfig = trackingGroup?.configurations.find((config) => config.key === SIGNING_KEY);
  const { fileUpload } = guide;
  const isQuickSetup = !!fileUpload && (setupMode === 'quick' || !!fileUpload.isOnlyMode);
  const shownCredentials = orderCredentials(credentials, guide.fieldOrder).map((credential) => ({
    ...credential,
    ...guide.fieldOverrides?.[credential.key],
  }));

  // Quick setup moves the credentials only tracking needs into the tracking step; without that step they stay put.
  const trackingFields =
    isQuickSetup && trackingGroup
      ? shownCredentials.filter((credential) =>
          guide.tracking?.quickSetupFields?.includes(credential.key as CredentialsKeyEnum)
        )
      : [];

  const renderField = (credential: IConfigCredential) => {
    if (isQuickSetup && fileUpload.kind === 'awsAccessKey' && credential.key === CredentialsKeyEnum.Region) {
      return (
        <AwsRegionField key={credential.key} control={control} label={credential.displayName} isReadOnly={isReadOnly} />
      );
    }

    if (fileUpload?.kind === 'serviceAccount' && credential.key === CredentialsKeyEnum.ServiceAccount) {
      return (
        <ServiceAccountPaste
          key={credential.key}
          control={control}
          label={credential.displayName}
          isReadOnly={isReadOnly}
        />
      );
    }

    if (fileUpload?.kind === 'apnsKey' && credential.key === CredentialsKeyEnum.SecretKey) {
      return (
        <ApnsKeyPaste key={credential.key} control={control} label={credential.displayName} isReadOnly={isReadOnly} />
      );
    }

    if (fileUpload?.kind === 'apnsKey' && credential.key === CredentialsKeyEnum.Secure) {
      return (
        <ApnsEnvironmentField
          key={credential.key}
          control={control}
          label={credential.displayName}
          isReadOnly={isReadOnly}
        />
      );
    }

    return guide.segmentedFields?.includes(credential.key as CredentialsKeyEnum) ? (
      <ChoiceField key={credential.key} credential={credential} control={control} isReadOnly={isReadOnly} />
    ) : (
      <CredentialSection key={credential.key} credential={credential} control={control} isReadOnly={isReadOnly} />
    );
  };

  return (
    <SetupStepperRail className="-ml-3 pb-4">
      <SetupStep
        index={1}
        status="current"
        title={guide.sourceStep.title}
        description={guide.sourceStep.description(`Novu – ${environmentName ?? 'Development'}`)}
        extraContent={
          <div className="flex flex-wrap gap-2">
            <SetupButton href={guide.sourceStep.url}>{guide.sourceStep.buttonLabel}</SetupButton>
            {guide.sourceStep.copyable && <CopyTextButton {...guide.sourceStep.copyable} />}
          </div>
        }
      />
      {isQuickSetup ? (
        <SetupStep
          index={2}
          status="current"
          title={fileUpload.title}
          description={fileUpload.description}
          extraContent={
            <div className="flex flex-col gap-3" onPasteCapture={handlePaste}>
              {fileUpload.kind === 'awsAccessKey' ? (
                <AwsAccessKeyUpload
                  control={control}
                  setValue={setValue}
                  keyIdCredential={shownCredentials.find((credential) => credential.key === CredentialsKeyEnum.ApiKey)}
                  secretCredential={shownCredentials.find(
                    (credential) => credential.key === CredentialsKeyEnum.SecretKey
                  )}
                  isReadOnly={isReadOnly}
                />
              ) : fileUpload.kind === 'apnsKey' ? (
                <ApnsKeyUpload
                  control={control}
                  setValue={setValue}
                  keyIdCredential={shownCredentials.find((credential) => credential.key === CredentialsKeyEnum.ApiKey)}
                  isReadOnly={isReadOnly}
                />
              ) : (
                <ServiceAccountUpload control={control} setValue={setValue} isReadOnly={isReadOnly} />
              )}
              {shownCredentials
                .filter(
                  (credential) =>
                    !fileUpload.fileKeys.includes(credential.key as CredentialsKeyEnum) &&
                    !trackingFields.some((field) => field.key === credential.key)
                )
                .map(renderField)}
              {foundNote}
            </div>
          }
        />
      ) : (
        <SetupStep
          index={2}
          status="current"
          title={guide.credentialsTitle ?? 'Enter your credentials'}
          description={guide.credentialsDescription}
          extraContent={
            <div className="flex flex-col gap-3" onPasteCapture={handlePaste}>
              {shownCredentials.map(renderField)}
              {foundNote}
            </div>
          }
        />
      )}
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
                label={guide.tracking.switchLabel}
                description={guide.tracking.switchDescription}
                isReadOnly={isReadOnly}
              />
              {isTrackingEnabled &&
                trackingFields.map((credential) => (
                  <CredentialSection
                    key={credential.key}
                    credential={credential}
                    control={control}
                    isReadOnly={isReadOnly}
                  />
                ))}
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

/** Copies text the user pastes into the provider, and says so for a moment. */
function CopyTextButton({ label, value }: { label: string; value: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      showErrorToast('Couldn’t copy. Copy it from the docs instead.');

      return;
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <SetupButton
      onClick={() => void copy()}
      leadingIcon={
        isCopied ? <RiCheckLine className="size-3 shrink-0" /> : <RiFileCopyLine className="size-3 shrink-0" />
      }
    >
      <span aria-live="polite">{isCopied ? 'Copied' : label}</span>
    </SetupButton>
  );
}

function TrackingToggle({
  control,
  label,
  description,
  isReadOnly,
}: {
  control: Control<IntegrationFormData>;
  label: string;
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
            <span className="text-label-sm text-text-strong">{label}</span>
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

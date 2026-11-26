import type { IIntegration } from '@novu/shared';
import {
  AgentRuntimeProviderIdEnum,
  ChannelTypeEnum,
  ChatProviderIdEnum,
  ConfigConfiguration,
  CredentialsKeyEnum,
  EmailProviderIdEnum,
  IConfigCredential,
  PushProviderIdEnum,
  SmsProviderIdEnum,
} from '@novu/shared';

export const CHANNEL_LABELS: Record<ChannelTypeEnum, string> = {
  [ChannelTypeEnum.IN_APP]: 'In-app',
  [ChannelTypeEnum.EMAIL]: 'Email',
  [ChannelTypeEnum.SMS]: 'SMS',
  [ChannelTypeEnum.CHAT]: 'Chat',
  [ChannelTypeEnum.PUSH]: 'Push',
  [ChannelTypeEnum.TOOL]: 'Tool',
};

export function isDemoIntegration(providerId: string) {
  return (
    providerId === EmailProviderIdEnum.Novu ||
    providerId === SmsProviderIdEnum.Novu ||
    providerId === ChatProviderIdEnum.Novu ||
    providerId === AgentRuntimeProviderIdEnum.NovuAnthropic
  );
}

export function getDemoIntegrationTooltipMessage(providerId: string, channel?: string): string {
  if (providerId === AgentRuntimeProviderIdEnum.NovuAnthropic) {
    return 'This is a demo Claude provider for testing only, capped at 10 conversations per month and 100k tokens per conversation. Not suitable for production use.';
  }

  const unit = channel === 'email' ? 'emails' : 'sms';

  return `This is a demo provider for testing purposes only and capped at 300 ${unit} per month. Not suitable for production use.`;
}

export function configurationToCredential(config: ConfigConfiguration): IConfigCredential {
  return {
    key: config.key as CredentialsKeyEnum,
    value: config.value,
    placeholder: config.placeholder,
    dropdown: config.dropdown,
    displayName: config.displayName,
    description: config.description,
    type: config.type,
    required: config.required,
    links: config.links,
    tooltip: {
      text: config.tooltip,
    },
  } as IConfigCredential;
}

const OBJECT_CREDENTIAL_KEYS = new Set<string>([CredentialsKeyEnum.TlsOptions]);

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function credentialValueToInputString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

export function cleanCredentials(credentials: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(credentials)) {
    if (value === '' || value === undefined || value === null) continue;

    if (OBJECT_CREDENTIAL_KEYS.has(key) && typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);

        if (isPlainJsonObject(parsed)) {
          cleaned[key] = parsed;
          continue;
        }
      } catch {
        // leave as string, API validation will catch it
      }
    }

    cleaned[key] = value;
  }

  return cleaned;
}

/** Primary integrations can't have routing conditions; making one primary removes them. */
export function hasRoutingConditions(integration: IIntegration) {
  return (
    (!!integration.rules && Object.keys(integration.rules).length > 0) ||
    (!!integration.conditions && integration.conditions.length > 0)
  );
}

// Self-hosted installs can't reach the Novu team's inbox, so they ask for providers on GitHub.
export const GITHUB_NEW_ISSUE_URL = 'https://github.com/novuhq/novu/issues/new/choose';

/** The switch that turns on an email provider's activity tracking; Novu adds the webhook once the integration exists. */
export const ACTIVITY_TRACKING_ENABLER = 'inboundWebhookEnabled';

/** Providers set up with the guided credentials steps: where to get them, the form, and tracking where it applies. */
const GUIDED_SETUP_PROVIDERS = [
  EmailProviderIdEnum.Resend,
  EmailProviderIdEnum.SendGrid,
  EmailProviderIdEnum.SES,
  SmsProviderIdEnum.Twilio,
  PushProviderIdEnum.FCM,
  PushProviderIdEnum.APNS,
] as const;
export type GuidedSetupProviderId = (typeof GUIDED_SETUP_PROVIDERS)[number];

export function isGuidedSetupProvider(providerId?: string): providerId is GuidedSetupProviderId {
  return GUIDED_SETUP_PROVIDERS.some((id) => id === providerId);
}

/**
 * Guided email providers whose tracking switch starts on: Novu adds or offers their delivery webhook after create.
 * Push tracking needs work in the user's app, so it starts off and nothing runs after create.
 */
export function hasGuidedActivityTracking(providerId?: string) {
  return providerId === EmailProviderIdEnum.Resend || providerId === EmailProviderIdEnum.SendGrid;
}

/**
 * Guided email providers whose tracking is finished right after create: Novu adds the delivery webhook, or opens
 * the integration with the webhook URL to add by hand (always the case for SES).
 */
export function tracksDeliveryAfterCreate(providerId?: string) {
  return hasGuidedActivityTracking(providerId) || providerId === EmailProviderIdEnum.SES;
}

/** Providers whose create flow uses the setup layout: Quick setup / Manual, Advanced settings and the new footer. */
export function usesProviderSetupLayout(providerId?: string) {
  return (
    providerId === ChatProviderIdEnum.Slack ||
    providerId === ChatProviderIdEnum.Telegram ||
    providerId === ChatProviderIdEnum.MsTeams ||
    providerId === ChatProviderIdEnum.WhatsAppBusiness ||
    isGuidedSetupProvider(providerId)
  );
}

const SECURE_CREDENTIALS = [
  CredentialsKeyEnum.ApiKey,
  CredentialsKeyEnum.ApiToken,
  CredentialsKeyEnum.SecretKey,
  CredentialsKeyEnum.Token,
  CredentialsKeyEnum.Password,
  CredentialsKeyEnum.ServiceAccount,
  CredentialsKeyEnum.SigningSecret,
];

/** Secrets: masked in the form, and the fields a Reconnect asks the user to replace. */
export function isSecureCredential(credential: IConfigCredential) {
  return SECURE_CREDENTIALS.includes(credential.key as CredentialsKeyEnum);
}

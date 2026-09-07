import {
  AgentRuntimeProviderIdEnum,
  ChatProviderIdEnum,
  ConfigConfiguration,
  CredentialsKeyEnum,
  EmailProviderIdEnum,
  IConfigCredential,
  SmsProviderIdEnum,
} from '@novu/shared';

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

export function cleanCredentials(credentials: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(credentials)) {
    if (value === '' || value === undefined || value === null) continue;

    if (OBJECT_CREDENTIAL_KEYS.has(key) && typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object' && parsed !== null) {
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

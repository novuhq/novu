import {
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
    providerId === ChatProviderIdEnum.Novu
  );
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

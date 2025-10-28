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

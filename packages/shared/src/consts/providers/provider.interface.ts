import { ChannelTypeEnum, ConfigurationKey, CredentialsKeyEnum, ProvidersIdEnum } from '../../types';

export type ConfigConfiguration = {
  key: ConfigurationKey;
  value?: unknown;
  placeholder?: string;
  dropdown?: Array<{
    name: string;
    value: string | null;
  }>;
  displayName: string;
  description?: string;
  type: CredentialsType;
  required: boolean;
  links?: Array<{
    text: string;
    url: string;
  }>;
  tooltip?: string;
};

export interface ILogoFileName {
  light: string;
  dark: string;
}

export type ConfigConfigurationGroup = {
  groupType: CredentialsType;
  configurations: ConfigConfiguration[];
  enabler?: ConfigurationKey;
  setupWebhookUrlGuide?: string;
};

export interface IProviderConfig {
  id: ProvidersIdEnum;
  displayName: string;
  channel: ChannelTypeEnum;
  credentials: IConfigCredential[];
  configurations?: ConfigConfigurationGroup[];
  logoFileName: ILogoFileName;
  docReference: string;
  comingSoon?: boolean;
  betaVersion?: boolean;
}

type CredentialsType =
  | 'string'
  | 'dropdown'
  | 'switch'
  | 'textarea'
  | 'text'
  | 'number'
  | 'inboundWebhook'
  | 'boolean'
  | 'pushResources'
  | 'crossChannelConfigs'
  | 'inboxCount';

export interface IConfigCredential {
  key: CredentialsKeyEnum;
  value?: unknown;
  displayName: string;
  description?: string;
  placeholder?: string;
  type: CredentialsType;
  required: boolean;
  tooltip?: {
    text: string;
    when?: boolean;
  };
  dropdown?: Array<{
    name: string;
    value: string | null;
  }>;
  validation?: {
    pattern?: RegExp;
    message?: string;
    validate?: (value: string) => boolean | string;
  };
  links?: Array<{
    text: string;
    url: string;
  }>;
}

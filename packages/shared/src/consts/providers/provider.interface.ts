import { CredentialsKeyEnum, ProvidersIdEnum, ChannelTypeEnum } from '../../types';

export interface IProviderConfig {
  id: ProvidersIdEnum;
  displayName: string;
  channel: ChannelTypeEnum;
  credentials: IConfigCredentials[];
  logoFileName: ILogoFileName;
  docReference: string;
  comingSoon?: boolean;
  betaVersion?: boolean;
}

export interface IConfigCredentials {
  key: CredentialsKeyEnum;
  value?: unknown;
  displayName: string;
  description?: string;
  type: string;
  required: boolean;
  tooltip?: {
    text: string;
    when?: boolean;
  };
  dropdown?: Array<{
    name: string;
    value: string | null;
  }>;
}

export interface ILogoFileName {
  light: string;
  dark: string;
}

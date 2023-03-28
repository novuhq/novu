import { CredentialsKeyEnum } from './provider.enum';

import { ChannelTypeEnum } from '../../types';

export interface IProviderConfig {
  id: string;
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
}

export interface ILogoFileName {
  light: string;
  dark: string;
}

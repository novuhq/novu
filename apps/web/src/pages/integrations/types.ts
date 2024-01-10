import type {
  ChannelTypeEnum,
  IConfigCredentials,
  ICredentials,
  ILogoFileName,
  IProviderConfig,
  ProvidersIdEnum,
} from '@novu/shared';
import { IConditions } from '../../components/conditions';

export interface ITableIntegration {
  name: string;
  order: number;
  primary: boolean;
  integrationId: string;
  identifier: string;
  provider: string;
  providerId: ProvidersIdEnum;
  channel: string;
  channelType: ChannelTypeEnum;
  environment: string;
  active: boolean;
  logoFileName: IProviderConfig['logoFileName'];
  conditions?: IConditions[];
}

export interface IIntegratedProvider {
  providerId: ProvidersIdEnum;
  integrationId: string;
  displayName: string;
  channel: ChannelTypeEnum;
  hasCredentials?: boolean;
  credentials: IConfigCredentials[];
  docReference: string;
  comingSoon: boolean;
  active: boolean;
  connected: boolean;
  conditions?: IConditions[];
  logoFileName: ILogoFileName;
  betaVersion: boolean;
  novu?: boolean;
  environmentId?: string;
  name?: string;
  identifier?: string;
  primary: boolean;
}

export interface IntegrationEntity {
  _id?: string;
  _environmentId: string;
  _organizationId: string;
  name: string;
  identifier: string;
  providerId: ProvidersIdEnum;
  channel: ChannelTypeEnum;
  credentials: ICredentials;
  conditions?: IConditions[];
  active: boolean;
  deleted: boolean;
  order: number;
  primary: boolean;
  deletedAt: string;
  deletedBy: string;
}

import type { ChannelTypeEnum, IProviderConfig } from '@novu/shared';

export interface ITableIntegration {
  name: string;
  identyficator: string;
  provider: string;
  channel: string;
  channelType: ChannelTypeEnum;
  environment: string;
  active: boolean;
  logoFileName: IProviderConfig['logoFileName'];
}

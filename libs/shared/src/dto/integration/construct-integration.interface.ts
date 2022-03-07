import { ChannelTypeEnum } from '../../entities/message-template';

export interface ICredentialsDto {
  apiKey: string;

  secretKey: string;
}
export interface IConstructIntegrationDto {
  providerId: string;

  channel: ChannelTypeEnum;

  credentials: ICredentialsDto;

  active: boolean;
}

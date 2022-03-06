import { IConstructIntegrationDto } from './shared';
import { ChannelTypeEnum } from '../../entities/message-template';

export interface ICreateIntegrationBodyDto extends IConstructIntegrationDto {
  providerId: string;

  channel: ChannelTypeEnum;
}

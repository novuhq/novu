import { ChannelTypeEnum } from '../../entities/message-template';
import { IConstructIntegrationDto } from './construct-integration.interface';

export interface ICreateIntegrationBodyDto extends IConstructIntegrationDto {
  providerId: string;

  channel: ChannelTypeEnum;
}

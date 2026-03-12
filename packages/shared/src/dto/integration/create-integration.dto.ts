import { ChannelTypeEnum } from '../../types';
import { IConstructIntegrationDto } from './construct-integration.interface';

export interface ICreateIntegrationBodyDto extends IConstructIntegrationDto {
  providerId: string;
  channel: ChannelTypeEnum;
}

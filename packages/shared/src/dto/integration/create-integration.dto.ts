import { ChannelTypeEnum, IntegrationKindEnum } from '../../types';
import { IConstructIntegrationDto } from './construct-integration.interface';

export interface ICreateIntegrationBodyDto extends IConstructIntegrationDto {
  providerId: string;
  channel?: ChannelTypeEnum;
  /** Distinguishes delivery integrations from agent-runtime integrations. Defaults to 'delivery'. */
  kind?: IntegrationKindEnum;
}

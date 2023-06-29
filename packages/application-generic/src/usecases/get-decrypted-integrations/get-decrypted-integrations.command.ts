import { IsOptional } from 'class-validator';
import { ChannelTypeEnum, ProvidersIdEnum } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../commands';

export class GetDecryptedIntegrationsCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  findOne?: boolean;

  @IsOptional()
  active?: boolean;

  @IsOptional()
  channelType?: ChannelTypeEnum;

  @IsOptional()
  providerId?: ProvidersIdEnum;
}

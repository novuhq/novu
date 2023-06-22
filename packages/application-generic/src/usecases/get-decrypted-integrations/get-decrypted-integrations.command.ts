import { IsOptional } from 'class-validator';
import { ChannelTypeEnum, ProvidersIdEnum } from '@novu/shared';

import {
  EnvironmentWithUserCommand,
  OrganizationLevelWithUserCommand,
} from '../../commands';

export class GetDecryptedIntegrationsCommand extends OrganizationLevelWithUserCommand {
  @IsOptional()
  findOne?: boolean;

  @IsOptional()
  active?: boolean;

  @IsOptional()
  channelType?: ChannelTypeEnum;

  @IsOptional()
  providerId?: ProvidersIdEnum;
}

export class GetEnvironmentDecryptedIntegrationsCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  findOne?: boolean;

  @IsOptional()
  active?: boolean;

  @IsOptional()
  channelType?: ChannelTypeEnum;

  @IsOptional()
  providerId?: ProvidersIdEnum;
}

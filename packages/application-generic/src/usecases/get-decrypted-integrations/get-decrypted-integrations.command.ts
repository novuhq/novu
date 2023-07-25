import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ChannelTypeEnum, ProvidersIdEnum } from '@novu/shared';

import {
  EnvironmentWithUserCommand,
  OrganizationLevelWithUserCommand,
} from '../../commands';

export class GetDecryptedIntegrationsCommand extends EnvironmentWithUserCommand {
  @IsBoolean()
  @IsOptional()
  findOne?: boolean;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsEnum(ChannelTypeEnum)
  @IsOptional()
  channelType?: ChannelTypeEnum;

  @IsOptional()
  providerId?: ProvidersIdEnum;

  @IsOptional()
  @IsBoolean()
  hideNovuCredentials?: boolean = true;
}

export class GetEnvironmentDecryptedIntegrationsCommand extends EnvironmentWithUserCommand {
  @IsBoolean()
  @IsOptional()
  findOne?: boolean;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsEnum(ChannelTypeEnum)
  @IsOptional()
  channelType?: ChannelTypeEnum;

  @IsOptional()
  providerId?: ProvidersIdEnum;
}

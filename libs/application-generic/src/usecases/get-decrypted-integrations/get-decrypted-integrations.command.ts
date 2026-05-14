import { ChannelTypeEnum, ProvidersIdEnum } from '@novu/shared';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../commands';

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

  @IsBoolean()
  @IsOptional()
  returnCredentials?: boolean;

  /**
   * When true, restrict the query to integrations within `environmentId` only.
   * Default behavior (false/undefined) returns integrations across every
   * environment of the organization (legacy JWT/session behavior).
   */
  @IsBoolean()
  @IsOptional()
  scopeToEnvironment?: boolean;
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

  @IsBoolean()
  @IsOptional()
  returnCredentials?: boolean;
}

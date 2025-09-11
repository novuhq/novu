import {
  ChannelEndpointType,
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  ProvidersIdEnum,
  ProvidersIdEnumConst,
  ResourceKey,
} from '@novu/shared';
import { IsEnum, IsOptional } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsResourceKey } from '../../../shared/validators/resource-key.validator';

export class GetChannelEndpointsCommand extends EnvironmentCommand {
  @IsOptional()
  @IsResourceKey()
  resource?: ResourceKey;

  @IsEnum(ChannelTypeEnum)
  @IsOptional()
  channel?: ChannelTypeEnum;

  @IsEnum(ProvidersIdEnumConst)
  @IsOptional()
  provider?: ProvidersIdEnum;

  @IsEnum(Object.values(ENDPOINT_TYPES))
  @IsOptional()
  type?: ChannelEndpointType;
}

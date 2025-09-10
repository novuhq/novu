import {
  ADDRESS_TYPES,
  ChannelAddressType,
  ChannelTypeEnum,
  ProvidersIdEnum,
  ProvidersIdEnumConst,
  ResourceKey,
} from '@novu/shared';
import { IsEnum, IsOptional } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsResourceKey } from '../../../shared/validators/resource-key.validator';

export class GetChannelAddressesCommand extends EnvironmentCommand {
  @IsOptional()
  @IsResourceKey()
  resource?: ResourceKey;

  @IsEnum(ChannelTypeEnum)
  @IsOptional()
  channel?: ChannelTypeEnum;

  @IsEnum(ProvidersIdEnumConst)
  @IsOptional()
  provider?: ProvidersIdEnum;

  @IsEnum(Object.values(ADDRESS_TYPES))
  @IsOptional()
  type?: ChannelAddressType;
}

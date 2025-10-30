import { CursorBasedPaginatedCommand } from '@novu/application-generic';
import { ChannelEndpointEntity } from '@novu/dal';
import { ChannelTypeEnum, ProvidersIdEnum, ProvidersIdEnumConst, ResourceKey } from '@novu/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IsResourceKey } from '../../../shared/validators/resource-key.validator';

export class ListChannelEndpointsCommand extends CursorBasedPaginatedCommand<
  ChannelEndpointEntity,
  'createdAt' | 'updatedAt'
> {
  @IsOptional()
  @IsResourceKey()
  resource?: ResourceKey;

  @IsEnum(ChannelTypeEnum)
  @IsOptional()
  channel?: ChannelTypeEnum;

  @IsEnum(ProvidersIdEnumConst)
  @IsOptional()
  providerId?: ProvidersIdEnum;

  @IsOptional()
  @IsString()
  integrationIdentifier?: string;

  @IsOptional()
  @IsString()
  connectionIdentifier?: string;
}

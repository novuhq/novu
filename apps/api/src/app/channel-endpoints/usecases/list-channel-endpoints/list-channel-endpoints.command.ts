import { CursorBasedPaginatedCommand } from '@novu/application-generic';
import { ChannelEndpointEntity } from '@novu/dal';
import { ChannelTypeEnum, ProvidersIdEnum, ProvidersIdEnumConst } from '@novu/shared';
import { IsArray, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

const providerIdValues = [...new Set(Object.values(ProvidersIdEnumConst).flatMap((enumObj) => Object.values(enumObj)))];

export class ListChannelEndpointsCommand extends CursorBasedPaginatedCommand<
  ChannelEndpointEntity,
  'createdAt' | 'updatedAt'
> {
  @IsOptional()
  @IsString()
  subscriberId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];

  @IsEnum(ChannelTypeEnum)
  @IsOptional()
  channel?: ChannelTypeEnum;

  @IsIn(providerIdValues)
  @IsOptional()
  providerId?: ProvidersIdEnum;

  @IsOptional()
  @IsString()
  integrationIdentifier?: string;

  @IsOptional()
  @IsString()
  connectionIdentifier?: string;
}

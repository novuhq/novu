import { CursorBasedPaginatedCommand } from '@novu/application-generic';
import { ChannelConnectionEntity } from '@novu/dal';
import { ChannelTypeEnum, ProvidersIdEnum, ProvidersIdEnumConst, ResourceKey } from '@novu/shared';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class ListChannelConnectionsCommand extends CursorBasedPaginatedCommand<
  ChannelConnectionEntity,
  'createdAt' | 'updatedAt'
> {
  @IsOptional()
  @IsString()
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
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];
}

import { CursorBasedPaginatedCommand } from '@novu/application-generic';
import { ChannelConnectionEntity } from '@novu/dal';
import { ALL_PROVIDER_IDS, ChannelTypeEnum, ProvidersIdEnum } from '@novu/shared';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class ListChannelConnectionsCommand extends CursorBasedPaginatedCommand<
  ChannelConnectionEntity,
  'createdAt' | 'updatedAt'
> {
  @IsOptional()
  @IsString()
  subscriberId?: string;

  @IsEnum(ChannelTypeEnum)
  @IsOptional()
  channel?: ChannelTypeEnum;

  @IsEnum(ALL_PROVIDER_IDS)
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

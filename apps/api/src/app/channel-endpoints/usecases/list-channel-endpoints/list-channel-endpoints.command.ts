import { CursorBasedPaginatedCommand } from '@novu/application-generic';
import { ChannelEndpointEntity } from '@novu/dal';
import { ALL_PROVIDER_IDS, ChannelTypeEnum, ProvidersIdEnum } from '@novu/shared';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

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

  @IsEnum(ALL_PROVIDER_IDS)
  @IsOptional()
  providerId?: ProvidersIdEnum;

  @IsOptional()
  @IsString()
  integrationIdentifier?: string;

  @IsOptional()
  @IsString()
  connectionIdentifier?: string;
}

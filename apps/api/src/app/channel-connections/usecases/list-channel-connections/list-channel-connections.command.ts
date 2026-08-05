import { CursorBasedPaginatedCommand } from '@novu/application-generic';
import { ChannelConnectionEntity } from '@novu/dal';
import { ChannelTypeEnum, ConnectionMode, ProvidersIdEnum, providerIdValues } from '@novu/shared';
import { IsArray, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

export class ListChannelConnectionsCommand extends CursorBasedPaginatedCommand<
  ChannelConnectionEntity,
  'createdAt' | 'updatedAt'
> {
  @IsOptional()
  @IsString()
  subscriberId?: string;

  /**
   * Read-time scoping over `subscriberId` (only applied when `subscriberId` is set):
   * - `'subscriber'` returns only the subscriber's own connections;
   * - `'shared'` returns only shared connections (`subscriberId` null);
   * - omitted returns both (subscriber-owned and shared).
   */
  @IsOptional()
  @IsString()
  @IsIn(['subscriber', 'shared'])
  connectionMode?: ConnectionMode;

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
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];
}

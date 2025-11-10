import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ChannelTypeEnum,
  makeResourceKey,
  ProvidersIdEnum,
  ProvidersIdEnumConst,
  RESOURCE,
  ResourceKey,
} from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { IsResourceKey } from '../../shared/validators/resource-key.validator';
import { CursorPaginationQueryDto } from './cursor-pagination-query.dto';
import { GetChannelConnectionResponseDto } from './get-channel-connection-response.dto';

export class ListChannelConnectionsQueryDto extends CursorPaginationQueryDto<
  GetChannelConnectionResponseDto,
  'createdAt' | 'updatedAt'
> {
  @ApiPropertyOptional({
    description: 'Resource to filter results.',
    type: String,
    example: makeResourceKey(RESOURCE.SUBSCRIBER, 'user123'),
  })
  @IsResourceKey()
  @IsOptional()
  resource?: ResourceKey;

  @ApiPropertyOptional({
    description: 'Filter by channel type (email, sms, push, chat, etc.).',
    enum: ChannelTypeEnum,
    example: ChannelTypeEnum.CHAT,
  })
  @IsOptional()
  @IsEnum(ChannelTypeEnum)
  channel?: ChannelTypeEnum;

  @ApiPropertyOptional({
    description: 'Filter by provider identifier (e.g., sendgrid, twilio, slack, etc.).',
    enum: [...new Set([...Object.values(ProvidersIdEnumConst).flatMap((enumObj) => Object.values(enumObj))])],
    enumName: 'ProvidersIdEnum',
    type: String,
    example: 'slack',
  })
  @IsString()
  @IsOptional()
  @IsEnum(Object.values(ProvidersIdEnumConst))
  providerId?: ProvidersIdEnum;

  @ApiPropertyOptional({
    description: 'Filter by integration identifier.',
    type: String,
    example: 'slack-prod',
  })
  @IsOptional()
  @IsString()
  integrationIdentifier?: string;

  @ApiPropertyOptional({
    description: 'Filter by context keys.',
    type: String,
    isArray: true,
    example: ['tenant:org-123', 'region:us-east-1'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    // No parameter = no filter
    if (value === undefined) return undefined;

    // Empty string = filter for records with no (default) context
    if (value === '') return [];

    // Normalize to array and remove empty strings
    const array = Array.isArray(value) ? value : [value];
    return array.filter((v) => v !== '');
  })
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];
}

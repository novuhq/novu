import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum, ProvidersIdEnum, ProvidersIdEnumConst } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { CursorPaginationQueryDto } from './cursor-pagination-query.dto';
import { GetChannelConnectionResponseDto } from './get-channel-connection-response.dto';

export class ListChannelConnectionsQueryDto extends CursorPaginationQueryDto<
  GetChannelConnectionResponseDto,
  'createdAt' | 'updatedAt'
> {
  @ApiPropertyOptional({
    description: 'The subscriber ID to filter results by',
    type: String,
    example: 'subscriber-123',
  })
  @IsOptional()
  @IsString()
  subscriberId?: string;

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
    description: 'Filter by exact context keys, order insensitive (format: "type:id")',
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

import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum, ConnectionMode, ProvidersIdEnum, providerIdValues } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
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
    description:
      'Filter by connection owner. `subscriber` returns only subscriber-owned connections (only that ' +
      "subscriber's when `subscriberId` is set). `shared` returns only shared (workspace-level) connections. " +
      "When omitted, returns all connections, or only the subscriber's own when `subscriberId` is set.",
    enum: ['subscriber', 'shared'],
    example: 'shared',
  })
  @IsOptional()
  @IsString()
  @IsIn(['subscriber', 'shared'])
  connectionMode?: ConnectionMode;

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
    enum: providerIdValues,
    enumName: 'ProvidersIdEnum',
    type: String,
    example: 'slack',
  })
  @IsString()
  @IsOptional()
  @IsIn(providerIdValues)
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

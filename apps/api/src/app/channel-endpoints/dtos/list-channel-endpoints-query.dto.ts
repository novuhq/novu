import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ChannelTypeEnum,
  makeResourceKey,
  ProvidersIdEnum,
  ProvidersIdEnumConst,
  RESOURCE,
  ResourceKey,
} from '@novu/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IsResourceKey } from '../../shared/validators/resource-key.validator';
import { CursorPaginationQueryDto } from './cursor-pagination-query.dto';
import { GetChannelEndpointResponseDto } from './get-channel-endpoint-response.dto';

export class ListChannelEndpointsQueryDto extends CursorPaginationQueryDto<
  GetChannelEndpointResponseDto,
  'createdAt' | 'updatedAt'
> {
  @ApiPropertyOptional({
    description: 'Resource to filter results.',
    type: String,
    example: makeResourceKey(RESOURCE.SUBSCRIBER, 'user123'),
  })
  @IsOptional()
  @IsResourceKey()
  resource?: ResourceKey;

  @ApiPropertyOptional({
    description: 'Channel type to filter results.',
    enum: ChannelTypeEnum,
  })
  @IsEnum(ChannelTypeEnum)
  @IsOptional()
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
    description: 'Integration identifier to filter results.',
    type: String,
    example: 'slack-prod',
  })
  @IsOptional()
  @IsString()
  integrationIdentifier?: string;

  @ApiPropertyOptional({
    description: 'Connection identifier to filter results.',
    type: String,
    example: 'slack-connection-abc123',
  })
  @IsOptional()
  @IsString()
  connectionIdentifier?: string;
}

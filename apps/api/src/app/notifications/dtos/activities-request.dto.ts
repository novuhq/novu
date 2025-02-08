import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';
import { IsOptional } from 'class-validator';

export class ActivitiesRequestDto {
  @ApiPropertyOptional({
    enum: [...Object.values(ChannelTypeEnum)],
    enumName: 'ChannelTypeEnum',
    isArray: true,
    description: 'Array of channel types',
  })
  @IsOptional()
  channels?: ChannelTypeEnum[] | ChannelTypeEnum;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    description: 'Array of template IDs or a single template ID',
  })
  @IsOptional()
  templates?: string[] | string;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    description: 'Array of email addresses or a single email address',
  })
  @IsOptional()
  emails?: string | string[];

  @ApiPropertyOptional({
    type: String,
    deprecated: true,
    description: 'Search term (deprecated)',
  })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    description: 'Array of subscriber IDs or a single subscriber ID',
  })
  @IsOptional()
  subscriberIds?: string | string[];

  @ApiPropertyOptional({
    type: Number,
    default: 0,
    description: 'Page number for pagination',
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    type: String,
    description: 'Transaction ID for filtering',
  })
  @IsOptional()
  transactionId?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Date filter for records after this timestamp',
  })
  @IsOptional()
  after?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Date filter for records before this timestamp',
  })
  @IsOptional()
  before?: string;
}

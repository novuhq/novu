import { Type } from 'class-transformer';
import { IsOptional, IsInt, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';

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
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page: number = 0;

  @ApiPropertyOptional({
    type: Number,
    default: 10,
    minimum: 1,
    maximum: 50,
    description: 'Limit for pagination',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;

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

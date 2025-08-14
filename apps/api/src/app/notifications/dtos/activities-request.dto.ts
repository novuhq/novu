import { ApiHideProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum, SeverityLevelEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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

  @ApiHideProperty()
  /* @ApiPropertyOptional({
    type: String,
    isArray: true,
    description: 'Array of severity levels or a single severity level',
  }) */
  @IsOptional()
  severity?: SeverityLevelEnum[] | SeverityLevelEnum;

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
    description: 'The transaction ID to filter by',
  })
  @IsOptional()
  transactionId?: string[] | string;

  @ApiPropertyOptional({
    type: String,
    description: 'Topic Key for filtering notifications by topic',
  })
  @IsOptional()
  @IsString()
  topicKey?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Date filter for records after this timestamp. Defaults to earliest date allowed by subscription plan',
  })
  @IsOptional()
  after?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Date filter for records before this timestamp. Defaults to current time of request (now)',
  })
  @IsOptional()
  before?: string;
}

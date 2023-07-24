import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';

export class ActivitiesRequestDto {
  @ApiProperty({
    enum: ChannelTypeEnum,
    isArray: true,
  })
  channels: ChannelTypeEnum[] | ChannelTypeEnum;

  @ApiProperty({
    type: String,
    isArray: true,
  })
  templates: string[] | string;

  @ApiProperty({
    type: String,
    isArray: true,
  })
  emails: string | string[];

  @ApiProperty({
    type: String,
    deprecated: true,
  })
  search: string;

  @ApiProperty({
    type: String,
    isArray: true,
  })
  subscriberIds: string | string[];

  @ApiPropertyOptional({
    type: Number,
    required: false,
  })
  page?: number = 0;

  @ApiPropertyOptional({
    type: String,
    required: false,
  })
  transactionId: string;
}

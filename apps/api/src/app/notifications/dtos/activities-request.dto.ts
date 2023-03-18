import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum, PeriodicityEnum } from '@novu/shared';

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
  @ApiProperty()
  templates: string[] | string;
  @ApiProperty({
    type: String,
    isArray: true,
  })
  @ApiProperty()
  emails: string | string[];
  @ApiProperty({
    type: String,
  })
  @ApiProperty()
  search: string;
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

  @ApiProperty({
    type: String,
    required: false,
  })
  startDate?: string;
  @ApiProperty({
    type: String,
    required: false,
  })
  endDate?: string;

  @ApiProperty({
    enum: PeriodicityEnum,
    required: false,
  })
  periodicity?: PeriodicityEnum;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';
import { IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetMessagesRequestDto {
  @ApiPropertyOptional({
    enum: ChannelTypeEnum,
  })
  channel?: ChannelTypeEnum;

  @ApiPropertyOptional({
    type: String,
  })
  subscriberId?: string;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
  })
  transactionId?: string[] | string;

  @ApiPropertyOptional({
    type: Number,
    default: 0,
  })
  @IsNumber()
  @Transform(({ value }) => {
    return Number(value);
  })
  page?: number = 0;

  @ApiPropertyOptional({
    type: Number,
    default: 10,
  })
  @IsNumber()
  @Transform(({ value }) => {
    return Number(value);
  })
  limit?: number = 10;
}

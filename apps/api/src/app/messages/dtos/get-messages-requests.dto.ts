import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';
import { IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetMessagesRequestDto {
  @ApiPropertyOptional({
    enum: [...Object.values(ChannelTypeEnum)],
    enumName: 'ChannelTypeEnum',
  })
  channel?: ChannelTypeEnum;

  @ApiPropertyOptional({
    type: String,
  })
  @IsOptional()
  subscriberId?: string;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
  })
  @IsOptional()
  transactionId?: string[];

  @ApiPropertyOptional({
    type: Number,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  page?: number;

  @ApiPropertyOptional({
    type: Number,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  limit?: number;

  constructor() {
    this.page = 0; // Default value
    this.limit = 10; // Default value
  }
}

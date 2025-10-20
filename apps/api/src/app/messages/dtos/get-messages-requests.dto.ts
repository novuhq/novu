import { ApiHideProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

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
    type: [String],
    description: 'Filter by exact context keys (format: "type:id")',
    example: ['tenant:org-123', 'region:us-east-1'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];

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

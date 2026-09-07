import { ApiPropertyOptional } from '@nestjs/swagger';
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
    type: String,
    isArray: true,
    description: 'Filter by exact context keys, order insensitive (format: "type:id")',
    example: ['tenant:org-123', 'region:us-east-1'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    // No parameter = no filter
    if (value === undefined) return undefined;

    // Empty string = filter for records with no context
    if (value === '') return [];

    // Normalize to array and remove empty strings
    const array = Array.isArray(value) ? value : [value];
    return array.filter((v) => v !== '');
  })
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

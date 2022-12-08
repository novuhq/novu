import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

import { TopicDto } from './topic.dto';

import { TopicKey } from '../types';

export class FilterTopicsRequestDto {
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @IsPositive()
  @ApiPropertyOptional({ type: Number })
  public page?: number;

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @IsPositive()
  @ApiPropertyOptional({ type: Number })
  public pageSize?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String })
  public key?: TopicKey;
}

export class FilterTopicsResponseDto {
  @ApiProperty({
    type: Array,
  })
  data: TopicDto[];

  @ApiProperty({
    type: Number,
  })
  page: number;

  @ApiProperty({
    type: Number,
  })
  pageSize: number;

  @ApiProperty({
    type: Number,
  })
  totalCount: number;
}

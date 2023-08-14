import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

import { TopicDto } from './topic.dto';

import { TopicKey } from '../types';

export class FilterTopicsRequestDto {
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ type: Number })
  public page?: number = 0;

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ type: Number })
  public pageSize?: number = 10;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String })
  public key?: TopicKey;
}

export class FilterTopicsResponseDto {
  @ApiProperty({
    type: TopicDto,
    isArray: true,
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

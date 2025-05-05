import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { Transform } from 'class-transformer';
import { TopicDto } from './topic.dto';

export class FilterTopicsRequestDto {
  @ApiProperty({
    example: 0,
    required: false,
    type: 'integer',
    format: 'int64',
    description: 'The page number to retrieve (starts from 0)',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value)) // Convert string to integer
  public page?: number = 0;

  @ApiProperty({
    example: 10,
    required: false,
    type: 'integer',
    format: 'int64',
    description: 'The number of items to return per page (default: 10)',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value)) // Convert string to integer
  public pageSize?: number = 10;

  @ApiProperty({
    example: 'exampleKey',
    required: false,
    type: 'string',
    description: 'A filter key to apply to the results',
  })
  @IsString()
  @IsOptional()
  public key?: string;
}

export class FilterTopicsResponseDto {
  @ApiProperty({
    example: [],
    type: [TopicDto],
    description: 'The list of topics',
  })
  data: TopicDto[];

  @ApiProperty({
    example: 1,
    type: Number,
    description: 'The current page number',
  })
  page: number;

  @ApiProperty({
    example: 10,
    type: Number,
    description: 'The number of items per page',
  })
  pageSize: number;

  @ApiProperty({
    example: 10,
    type: Number,
    description: 'The total number of items',
  })
  totalCount: number;
}

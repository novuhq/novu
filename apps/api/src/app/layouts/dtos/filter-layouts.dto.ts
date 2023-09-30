import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

import { LayoutDto } from './layout.dto';

import { OrderDirectionEnum } from '../types';

export class FilterLayoutsRequestDto {
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ type: Number })
  public page?: number;

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ type: Number })
  public pageSize?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String })
  public sortBy?: string;

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ type: Number })
  public orderBy?: OrderDirectionEnum;
}

export class FilterLayoutsResponseDto {
  @ApiProperty({
    type: LayoutDto,
    isArray: true,
  })
  data: LayoutDto[];

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

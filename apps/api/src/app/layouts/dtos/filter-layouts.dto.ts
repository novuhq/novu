import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

import { Transform } from 'class-transformer';
import { OrderByEnum } from '@novu/shared';
import { LayoutDto } from './layout.dto';

export class FilterLayoutsRequestDto {
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ type: Number, description: 'Number of page for pagination', required: false })
  public page?: number;

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ type: Number, description: 'Size of page for pagination', required: false })
  public pageSize?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    type: String,
    description: 'Sort field. Currently only supported `createdAt`',
    required: false,
  })
  public sortBy?: string;

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    enum: OrderByEnum,
    description: 'Direction of the sorting query param',
    required: false,
  })
  public orderBy?: number | OrderByEnum;
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

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DirectionEnum } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class CursorPaginationQueryDto<T, K extends keyof T> {
  @ApiProperty({
    description: 'Cursor for pagination indicating the starting point after which to fetch results.',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  after?: string;

  @ApiProperty({
    description: 'Cursor for pagination indicating the ending point before which to fetch results.',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  before?: string;

  @ApiPropertyOptional({
    description: 'Limit the number of items to return',
    type: Number,
  })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Direction of sorting',
    enum: DirectionEnum,
  })
  @IsOptional()
  orderDirection?: DirectionEnum;

  @ApiPropertyOptional({
    description: 'Field to order by',
    type: String,
  })
  @IsString()
  @IsOptional()
  orderBy?: K;

  @ApiPropertyOptional({
    description: 'Include cursor item in response',
    type: Boolean,
  })
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  includeCursor?: boolean;
}

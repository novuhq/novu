import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { DirectionEnum } from '@novu/shared';

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

  limit?: number;
  orderDirection?: DirectionEnum;
  orderBy?: K;
}

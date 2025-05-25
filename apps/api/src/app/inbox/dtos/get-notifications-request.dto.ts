import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { CursorPaginationRequestDto } from '../../shared/dtos/cursor-pagination-request';
import { NotificationFilter } from '../utils/types';

const LIMIT = {
  DEFAULT: 10,
  MAX: 100,
};

export class GetNotificationsRequestDto
  extends CursorPaginationRequestDto(LIMIT.DEFAULT, LIMIT.MAX)
  implements NotificationFilter
{
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  read?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  archived?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  snoozed?: boolean;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter by data attributes (JSON string)',
  })
  data?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { SeverityLevelEnum } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

import { CursorPaginationRequestDto } from '../../shared/dtos/cursor-pagination-request';
import { IsEnumOrArray } from '../../shared/validators/is-enum-or-array';
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
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  seen?: boolean;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter by data attributes (JSON string)',
  })
  data?: string;

  @IsOptional()
  @IsEnumOrArray(SeverityLevelEnum)
  @ApiPropertyOptional({
    description: 'Filter by severity levels',
    type: [String],
    enum: SeverityLevelEnum,
  })
  severity?: SeverityLevelEnum | SeverityLevelEnum[];

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Filter notifications created after this date (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Filter notifications created before this date (ISO 8601 format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  createdBefore?: string;
}

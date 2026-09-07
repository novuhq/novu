import { ApiPropertyOptional } from '@nestjs/swagger';
import { SeverityLevelEnum, type TagsFilter } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

import { CursorPaginationRequestDto } from '../../shared/dtos/cursor-pagination-request';
import { IsEnumOrArray } from '../../shared/validators/is-enum-or-array';
import { parseTagsQueryValue } from '../utils/parse-tags-query';
import { NotificationFilter } from '../utils/types';
import { IsTagsFilter } from '../validators/is-tags-filter.validator';

const LIMIT = {
  DEFAULT: 10,
  MAX: 100,
};

export class GetNotificationsRequestDto
  extends CursorPaginationRequestDto(LIMIT.DEFAULT, LIMIT.MAX)
  implements NotificationFilter
{
  @IsOptional()
  @Transform(({ value }) => parseTagsQueryValue(value))
  @IsTagsFilter()
  tags?: TagsFilter;

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
  @IsInt()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @ApiPropertyOptional({
    description: 'Filter notifications created on or after this timestamp (Unix timestamp in milliseconds)',
    example: 1704067200000,
  })
  createdGte?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @ApiPropertyOptional({
    description: 'Filter notifications created on or before this timestamp (Unix timestamp in milliseconds)',
    example: 1735689599999,
  })
  createdLte?: number;
}

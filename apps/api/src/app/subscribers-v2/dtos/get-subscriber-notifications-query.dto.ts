import { ApiPropertyOptional } from '@nestjs/swagger';
import { SeverityLevelEnum, type TagsFilter } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { parseTagsQueryValue } from '../../inbox/utils/parse-tags-query';
import { NotificationFilter } from '../../inbox/utils/types';
import { IsTagsFilter } from '../../inbox/validators/is-tags-filter.validator';
import { CursorPaginationRequestDto } from '../../shared/dtos/cursor-pagination-request';
import { IsEnumOrArray } from '../../shared/validators/is-enum-or-array';

const LIMIT = {
  DEFAULT: 10,
  MAX: 100,
};

export class GetSubscriberNotificationsQueryDto
  extends CursorPaginationRequestDto(LIMIT.DEFAULT, LIMIT.MAX)
  implements NotificationFilter
{
  @IsOptional()
  @Transform(({ value }) => parseTagsQueryValue(value))
  @IsTagsFilter()
  @ApiPropertyOptional({
    description:
      'Filter by workflow tags. Plain string[] is OR. Use { and: [{ or: string[] }, ...] } for AND of OR-groups (same as inbox).',
  })
  tags?: TagsFilter;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : value === 'true'))
  @ApiPropertyOptional({
    description: 'Filter by read/unread state',
    type: Boolean,
  })
  read?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : value === 'true'))
  @ApiPropertyOptional({
    description: 'Filter by archived state',
    type: Boolean,
  })
  archived?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : value === 'true'))
  @ApiPropertyOptional({
    description: 'Filter by snoozed state',
    type: Boolean,
  })
  snoozed?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : value === 'true'))
  @ApiPropertyOptional({
    description: 'Filter by seen state',
    type: Boolean,
  })
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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;

    return Array.isArray(value) ? value : [value];
  })
  @ApiPropertyOptional({
    description: 'Context keys for filtering notifications in multi-context scenarios',
    type: [String],
  })
  contextKeys?: string[];
}

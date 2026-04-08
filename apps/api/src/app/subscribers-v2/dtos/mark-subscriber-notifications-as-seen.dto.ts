import { ApiPropertyOptional } from '@nestjs/swagger';
import { type TagsFilter } from '@novu/shared';
import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';
import { IsTagsFilter } from '../../inbox/validators/is-tags-filter.validator';

export class MarkSubscriberNotificationsAsSeenDto {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  @ApiPropertyOptional({
    description: 'Specific notification IDs to mark as seen',
    type: [String],
  })
  notificationIds?: string[];

  @IsOptional()
  @IsTagsFilter()
  @ApiPropertyOptional({
    description:
      'Filter notifications by workflow tags (OR for string[], or { and: [{ or: string[] }, ...] } for AND of OR-groups).',
  })
  tags?: TagsFilter;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter notifications by data attributes (JSON string)',
  })
  data?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'Context keys for filtering notifications',
    type: [String],
  })
  contextKeys?: string[];
}

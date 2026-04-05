import { type TagsFilter } from '@novu/shared';
import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';

import { IsTagsFilter } from '../validators/is-tags-filter.validator';

export class MarkNotificationsAsSeenRequestDto {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  notificationIds?: string[];

  @IsOptional()
  @IsTagsFilter()
  tags?: TagsFilter;

  @IsOptional()
  @IsString()
  data?: string;
}

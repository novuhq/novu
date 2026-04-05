import { type TagsFilter } from '@novu/shared';
import { IsOptional, IsString } from 'class-validator';

import { IsTagsFilter } from '../validators/is-tags-filter.validator';

export class UpdateAllNotificationsRequestDto {
  @IsOptional()
  @IsTagsFilter()
  tags?: TagsFilter;

  @IsOptional()
  @IsString()
  data?: string;
}

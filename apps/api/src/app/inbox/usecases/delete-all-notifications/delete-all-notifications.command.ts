import { type TagsFilter } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { NotificationFilter } from '../../utils/types';
import { IsTagsFilter } from '../../validators/is-tags-filter.validator';

class Filter implements NotificationFilter {
  @IsOptional()
  @IsTagsFilter()
  tags?: TagsFilter;

  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @IsOptional()
  @IsString()
  data?: string;
}

export class DeleteAllNotificationsCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @ValidateNested()
  @Type(() => Filter)
  readonly filters: Filter;
}

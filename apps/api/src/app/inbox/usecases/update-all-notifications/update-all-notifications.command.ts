import { type TagsFilter } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { IsTagsFilter } from '../../validators/is-tags-filter.validator';
import { NotificationFilter } from '../../utils/types';

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

export class UpdateAllNotificationsCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @ValidateNested()
  @Type(() => Filter)
  readonly from: Filter;

  @IsDefined()
  @ValidateNested()
  @Type(() => Filter)
  readonly to: Filter;
}

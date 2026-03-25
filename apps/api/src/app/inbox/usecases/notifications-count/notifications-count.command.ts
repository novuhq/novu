import { SubscriberEntity } from '@novu/dal';
import { type TagsFilter, SeverityLevelEnum } from '@novu/shared';
import { IsArray, IsBoolean, IsDefined, IsOptional } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { IsEnumOrArray } from '../../../shared/validators/is-enum-or-array';
import { IsTagsFilter } from '../../validators/is-tags-filter.validator';
import { NotificationFilter } from '../../utils/types';

class NotificationsFilter implements NotificationFilter {
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
  @IsBoolean()
  snoozed?: boolean;

  @IsOptional()
  @IsBoolean()
  seen?: boolean;

  @IsOptional()
  @IsEnumOrArray(SeverityLevelEnum)
  severity?: SeverityLevelEnum | SeverityLevelEnum[];
}

export class NotificationsCountCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @IsArray()
  filters: NotificationsFilter[];

  @IsOptional()
  subscriber?: SubscriberEntity;
}

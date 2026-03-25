import { type TagsFilter } from '@novu/shared';
import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { IsTagsFilter } from '../../validators/is-tags-filter.validator';

export class MarkNotificationsAsSeenCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  readonly notificationIds?: string[];

  @IsOptional()
  @IsTagsFilter()
  readonly tags?: TagsFilter;

  @IsOptional()
  @IsString()
  readonly data?: string;
}

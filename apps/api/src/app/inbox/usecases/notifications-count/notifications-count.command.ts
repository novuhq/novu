import { IsArray, IsOptional } from 'class-validator';
import type { MessagesStatusEnum } from '@novu/shared';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class NotificationsCountCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsArray()
  readonly feedId?: string[];

  @IsOptional()
  readonly status: MessagesStatusEnum[];
}

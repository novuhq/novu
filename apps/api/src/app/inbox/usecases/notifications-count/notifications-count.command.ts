import { IsOptional } from 'class-validator';
import type { MessagesStatusEnum } from '@novu/shared';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class NotificationsCountCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  readonly status: MessagesStatusEnum[];
}

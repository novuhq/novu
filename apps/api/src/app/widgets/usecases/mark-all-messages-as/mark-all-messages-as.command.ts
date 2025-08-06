import { MessagesStatusEnum } from '@novu/shared';
import { IsDefined, IsOptional } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class MarkAllMessagesAsCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  feedIdentifiers?: string[];

  @IsDefined()
  markAs: MessagesStatusEnum;
}

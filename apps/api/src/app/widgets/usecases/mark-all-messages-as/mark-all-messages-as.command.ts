import { IsOptional, IsDefined } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class MarkAllMessagesAsCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  feedIds?: string[];

  @IsDefined()
  markAs: 'read' | 'seen';
}

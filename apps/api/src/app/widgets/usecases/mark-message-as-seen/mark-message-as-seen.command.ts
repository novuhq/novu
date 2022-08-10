import { IsMongoId } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class MarkMessageAsSeenCommand extends EnvironmentWithSubscriber {
  @IsMongoId()
  messageId: string;
}

import { IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class RemoveMessageCommand extends EnvironmentWithSubscriber {
  @IsString()
  messageId: string;
}

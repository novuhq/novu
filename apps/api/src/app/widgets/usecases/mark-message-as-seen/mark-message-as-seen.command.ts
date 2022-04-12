import { IsMongoId } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class MarkMessageAsSeenCommand extends EnvironmentWithSubscriber {
  static create(data: MarkMessageAsSeenCommand) {
    return CommandHelper.create<MarkMessageAsSeenCommand>(MarkMessageAsSeenCommand, data);
  }

  @IsMongoId()
  messageId: string;
}

import { IsMongoId } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithSubscriber } from '../../../shared/commands/project.command';

export class MarkMessageAsSeenCommand extends ApplicationWithSubscriber {
  static create(data: MarkMessageAsSeenCommand) {
    return CommandHelper.create<MarkMessageAsSeenCommand>(MarkMessageAsSeenCommand, data);
  }

  @IsMongoId()
  messageId: string;
}

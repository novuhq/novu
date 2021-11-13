import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithSubscriber } from '../../../shared/commands/project.command';

export class GetUnseenCountCommand extends ApplicationWithSubscriber {
  static create(data: GetUnseenCountCommand) {
    return CommandHelper.create<GetUnseenCountCommand>(GetUnseenCountCommand, data);
  }
}

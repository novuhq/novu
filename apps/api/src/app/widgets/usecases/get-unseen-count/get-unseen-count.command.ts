import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetUnseenCountCommand extends EnvironmentWithSubscriber {
  static create(data: GetUnseenCountCommand) {
    return CommandHelper.create<GetUnseenCountCommand>(GetUnseenCountCommand, data);
  }
}

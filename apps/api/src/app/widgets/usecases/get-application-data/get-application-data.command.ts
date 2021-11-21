import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithSubscriber } from '../../../shared/commands/project.command';

export class GetApplicationDataCommand extends ApplicationWithSubscriber {
  static create(data: GetApplicationDataCommand) {
    return CommandHelper.create<GetApplicationDataCommand>(GetApplicationDataCommand, data);
  }
}

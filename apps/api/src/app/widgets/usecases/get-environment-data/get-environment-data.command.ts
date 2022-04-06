import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetEnvironmentDataCommand extends EnvironmentWithSubscriber {
  static create(data: GetEnvironmentDataCommand) {
    return CommandHelper.create<GetEnvironmentDataCommand>(GetEnvironmentDataCommand, data);
  }
}

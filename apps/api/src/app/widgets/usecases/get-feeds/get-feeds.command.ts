import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetFeedsCommand extends EnvironmentWithSubscriber {
  static create(data: GetFeedsCommand) {
    return CommandHelper.create<GetFeedsCommand>(GetFeedsCommand, data);
  }
}

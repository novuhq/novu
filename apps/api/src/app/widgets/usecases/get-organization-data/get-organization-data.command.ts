import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetOrganizationDataCommand extends EnvironmentWithSubscriber {
  static create(data: GetOrganizationDataCommand) {
    return CommandHelper.create<GetOrganizationDataCommand>(GetOrganizationDataCommand, data);
  }
}

import { IsDefined } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationCommand } from '../../../shared/commands/project.command';

export class RemoveIntegrationCommand extends ApplicationCommand {
  static create(data: RemoveIntegrationCommand) {
    return CommandHelper.create(RemoveIntegrationCommand, data);
  }
  @IsDefined()
  integrationId: string;
}

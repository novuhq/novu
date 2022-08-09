import { IsDefined } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class RemoveIntegrationCommand extends EnvironmentCommand {
  @IsDefined()
  integrationId: string;
}

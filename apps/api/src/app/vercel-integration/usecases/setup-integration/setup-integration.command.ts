import { IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SetupIntegrationCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  vercelIntegrationCode: string;
}

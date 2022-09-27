import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsDefined } from 'class-validator';

export class SetupIntegrationCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  code: string;
}

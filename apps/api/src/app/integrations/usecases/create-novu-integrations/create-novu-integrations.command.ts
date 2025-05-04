import { EnvironmentEnum } from '@novu/shared';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateNovuIntegrationsCommand extends EnvironmentWithUserCommand {
  name: string | EnvironmentEnum;
}

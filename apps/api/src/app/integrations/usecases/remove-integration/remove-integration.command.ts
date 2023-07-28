import { IsDefined, IsNotEmpty } from 'class-validator';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class RemoveIntegrationCommand extends EnvironmentCommand {
  @IsNotEmpty()
  public readonly userId: string;

  @IsDefined()
  integrationId: string;
}

import { IsDefined, IsMongoId } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class RemoveIntegrationCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  integrationId: string;
}

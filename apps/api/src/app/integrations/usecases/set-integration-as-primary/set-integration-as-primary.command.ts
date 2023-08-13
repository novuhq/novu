import { IsDefined, IsMongoId } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SetIntegrationAsPrimaryCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  integrationId: string;
}

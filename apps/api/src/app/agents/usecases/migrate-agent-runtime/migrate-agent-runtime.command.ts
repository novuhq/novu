import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class MigrateAgentRuntimeCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsMongoId()
  integrationId: string;
}

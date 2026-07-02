import { IsDefined, IsMongoId, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';

export class IssueSlackSetupLinkCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  agentIdentifier: string;

  @IsDefined()
  @IsMongoId()
  integrationId: string;
}

import { IsDefined, IsMongoId, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';

export class IssueSlackSetupLinkCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  agentIdentifier: string;

  @IsDefined()
  @IsMongoId()
  integrationId: string;

  /** Subscriber the Slack install should connect. Omitted by dashboard-issued links. */
  @IsOptional()
  @IsString()
  subscriberId?: string;
}

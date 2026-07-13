import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';

export class UpdateAgentInboxSharedCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsBoolean()
  disabled: boolean;
}

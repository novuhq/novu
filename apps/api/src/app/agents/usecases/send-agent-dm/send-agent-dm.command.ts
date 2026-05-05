import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SendAgentDmCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @IsString()
  @IsNotEmpty()
  markdown: string;
}

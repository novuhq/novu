import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SendAgentTestEmailCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsEmail()
  @IsNotEmpty()
  targetAddress: string;
}

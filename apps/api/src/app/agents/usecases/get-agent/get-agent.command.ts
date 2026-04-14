import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetAgentCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}

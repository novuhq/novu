import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetAgentDemoQuotaCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}

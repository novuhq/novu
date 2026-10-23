import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentCommand } from '../../../../shared/commands/project.command';

export class GetAgentWebChatHashCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}

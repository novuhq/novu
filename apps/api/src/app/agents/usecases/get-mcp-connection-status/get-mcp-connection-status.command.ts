import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetMcpConnectionStatusCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  mcpId: string;

  /** External subscriberId — converted to Mongo `Subscriber._id`. */
  @IsString()
  @IsNotEmpty()
  subscriberId: string;
}

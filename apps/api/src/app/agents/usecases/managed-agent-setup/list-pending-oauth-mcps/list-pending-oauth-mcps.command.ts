import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';

export class ListPendingOAuthMcpsCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentId: string;

  /** External subscriberId — converted to Mongo `Subscriber._id` inside the use case. */
  @IsString()
  @IsNotEmpty()
  subscriberId: string;
}

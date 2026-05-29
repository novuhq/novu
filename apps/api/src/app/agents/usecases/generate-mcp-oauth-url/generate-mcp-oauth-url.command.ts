import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GenerateMcpOAuthUrlCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  mcpId: string;

  /** External subscriberId — converted to Mongo `Subscriber._id` inside the use case. */
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  /** Conversation that initiated setup — round-trips through signed OAuth state. */
  @IsOptional()
  @IsString()
  conversationId?: string;
}

import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';

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

  /** Where the OAuth URL was generated — round-trips through signed OAuth state. */
  @IsOptional()
  @IsIn(['api', 'setup_card'])
  source?: 'api' | 'setup_card';

  /** Setup card: auto-approve all tools from this MCP after OAuth succeeds. */
  @IsOptional()
  @IsBoolean()
  trustToolsOnConnect?: boolean;
}

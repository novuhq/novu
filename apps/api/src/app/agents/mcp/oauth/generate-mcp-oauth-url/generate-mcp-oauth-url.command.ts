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

  /** Conversation that initiated setup — persisted on the pending connection callback context. */
  @IsOptional()
  @IsString()
  conversationId?: string;

  /** Where the OAuth URL was generated — persisted on the pending connection callback context. */
  @IsOptional()
  @IsIn(['api', 'user_chat'])
  source?: 'api' | 'user_chat';

  /** Setup card: auto-approve all tools from this MCP after OAuth succeeds. */
  @IsOptional()
  @IsBoolean()
  trustToolsOnConnect?: boolean;

  // ── Session resume fields (source: 'user_chat') ──────────────────────
  // Persisted on the pending connection (`oauthState.callbackContext`) so
  // the callback can resume the session without bloating the authorize URL.

  @IsOptional()
  @IsString()
  toolUseId?: string;

  @IsOptional()
  @IsString()
  integrationIdentifier?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  platformThreadId?: string;
}

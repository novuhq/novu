import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';

export class EnsureProviderManagedVaultCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  mcpId: string;

  /**
   * External subscriberId for the channel turn (Slack, Teams, etc.). When set,
   * the vault is provisioned for that subscriber directly instead of mapping
   * the dashboard `userId` to a `connect:<userId>` row. Used by the managed
   * agent setup-card flow.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  subscriberId?: string;

  /**
   * Conversation that the setup card was posted in. Round-tripped through the
   * signed "Connect from provider" link so the redirect handler can replay
   * the parked inbound turn once the user has clicked through.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  conversationId?: string;
}

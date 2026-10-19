import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';
import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';

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
   * the dashboard `userId` to the dashboard subscriber row. Used by the managed
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

  /**
   * `custom_tool_use` id of the `novu_tool_catalog` request_connect call that
   * triggered this setup card. Round-tripped through the signed redirect state
   * so `CompleteProviderManagedRedirect` can resolve the parked tool call once
   * the user clicks through — without it the managed session hangs on
   * `requires_action`.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  toolUseId?: string;

  /** Integration the turn is bound to; needed to resume the parked session on click. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  integrationIdentifier?: string;

  /** Channel the setup card is delivered on; needed to resume the parked session on click. */
  @IsOptional()
  @IsEnum(AgentPlatformEnum)
  platform?: AgentPlatformEnum;

  /** Platform thread the setup card lives in; needed to resume the parked session on click. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  platformThreadId?: string;
}

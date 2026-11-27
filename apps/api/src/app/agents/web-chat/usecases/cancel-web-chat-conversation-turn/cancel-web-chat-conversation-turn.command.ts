import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../../shared/commands/project.command';

export class CancelWebChatConversationTurnCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsNotEmpty()
  conversationIdentifier: string;

  /** The client's agent identifier; when set, it must be the conversation's agent. */
  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  /** The session came from a customer-signed subscriber token, so its context is trusted as the agent's tenant. */
  @IsBoolean()
  contextVerified: boolean;
}

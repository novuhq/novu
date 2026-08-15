import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../../shared/commands/project.command';

export class GetAgentChatConversationCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsNotEmpty()
  conversationIdentifier: string;
}

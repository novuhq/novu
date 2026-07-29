import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../../shared/commands/project.command';

export class CreateWebChatConversationCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  text: string;
}

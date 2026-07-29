import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../../shared/commands/project.command';

export class ListWebChatConversationEventsCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsNotEmpty()
  conversationIdentifier: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  afterSequence = 0;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

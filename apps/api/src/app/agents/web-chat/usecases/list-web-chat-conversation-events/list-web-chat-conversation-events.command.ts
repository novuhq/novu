import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../../shared/commands/project.command';

export class ListWebChatConversationEventsCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsNotEmpty()
  conversationIdentifier: string;

  /** Activity `_id` cursor that loads older history. Omit it to get the newest page. */
  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

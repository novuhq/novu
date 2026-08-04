import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../../shared/commands/project.command';

export class ListWebChatConversationEventsCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsNotEmpty()
  conversationIdentifier: string;

  /** Cursor: activity `_id` — fetch events after this activity (forward pagination). */
  @IsOptional()
  @IsString()
  after?: string;

  /** Cursor: activity `_id` — fetch events before this activity (reverse pagination). */
  @IsOptional()
  @IsString()
  before?: string;

  /** Gap-fill replay cursor — events with sequence strictly greater than this value. */
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

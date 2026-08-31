import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListWebChatConversationEventsQueryDto {
  /** Activity `_id` cursor that loads older history. Omit it to get the newest page. */
  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ListWebChatConversationEventsResponseDto {
  events: AgentEventEnvelope[];
  /** Cursor toward older history. Send it as `before`. Null when the beginning is reached. */
  olderCursor: string | null;
}

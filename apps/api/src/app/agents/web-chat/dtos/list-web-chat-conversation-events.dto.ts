import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListWebChatConversationEventsQueryDto {
  /** Cursor: activity `_id` for forward pagination. */
  @IsOptional()
  @IsString()
  after?: string;

  /** Cursor: activity `_id` for reverse pagination. */
  @IsOptional()
  @IsString()
  before?: string;

  /** Gap-fill replay cursor — events with sequence strictly greater than this value. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  afterSequence?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ListWebChatConversationEventsResponseDto {
  events: AgentEventEnvelope[];
  hasMore: boolean;
  next: string | null;
  previous: string | null;
}

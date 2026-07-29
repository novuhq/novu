import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListWebChatConversationEventsQueryDto {
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
}

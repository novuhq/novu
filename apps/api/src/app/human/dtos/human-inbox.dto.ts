import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Longest a `?wait=` long-poll holds the request, so it stays under proxy and load-balancer timeouts. */
export const HUMAN_INBOX_MAX_WAIT_SECONDS = 25;

export const INBOX_READ_FILTERS = ['unread', 'read', 'all'] as const;
export type InboxReadFilter = (typeof INBOX_READ_FILTERS)[number];

export const INBOX_STATUS_FILTERS = ['open', 'resolved', 'all'] as const;
export type InboxStatusFilter = (typeof INBOX_STATUS_FILTERS)[number];

export const INBOX_SENDERS_FILTERS = ['contacts', 'all'] as const;
export type InboxSendersFilter = (typeof INBOX_SENDERS_FILTERS)[number];

export class ListInboxQueryDto {
  @ApiPropertyOptional({
    enum: INBOX_READ_FILTERS,
    default: 'all',
    description: 'Unread threads, read threads, or both.',
  })
  @IsOptional()
  @IsIn(INBOX_READ_FILTERS)
  filter?: InboxReadFilter;

  @ApiPropertyOptional({ enum: INBOX_STATUS_FILTERS, default: 'open' })
  @IsOptional()
  @IsIn(INBOX_STATUS_FILTERS)
  status?: InboxStatusFilter;

  @ApiPropertyOptional({
    enum: INBOX_SENDERS_FILTERS,
    default: 'contacts',
    description: 'Threads a contact has written in, or every thread including those from strangers.',
  })
  @IsOptional()
  @IsIn(INBOX_SENDERS_FILTERS)
  senders?: InboxSendersFilter;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Identifier of the last thread of the previous page.' })
  @IsOptional()
  @IsString()
  after?: string;

  @ApiPropertyOptional({
    description: `Hold the request up to this many seconds until a thread matches (max ${HUMAN_INBOX_MAX_WAIT_SECONDS}).`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(HUMAN_INBOX_MAX_WAIT_SECONDS)
  wait?: number;

  @ApiPropertyOptional({ description: 'Relay agent whose threads to list. Defaults to `human-relay`.' })
  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}

export class GetInboxThreadQueryDto {
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Identifier of the oldest message of the previous page.' })
  @IsOptional()
  @IsString()
  before?: string;

  @ApiPropertyOptional({ description: 'Relay agent the thread belongs to. Defaults to `human-relay`.' })
  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}

export class InboxThreadActionQueryDto {
  @ApiPropertyOptional({ description: 'Relay agent the thread belongs to. Defaults to `human-relay`.' })
  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}

export type InboxSender = 'human' | 'agent' | 'system';

/** A contact is someone the operator added; a stranger wrote to the agent without being one. */
export type InboxPersonKind = 'contact' | 'stranger';

export type InboxThreadStatus = 'open' | 'resolved';

export interface InboxPersonDto {
  /** The contact's subscriberId. A stranger has no subscriber, so theirs is the channel's own id for them. */
  id: string;
  name?: string;
  kind: InboxPersonKind;
}

export interface InboxThreadDto {
  id: string;
  channel: string;
  /** `contact` once at least one contact is in the thread. */
  kind: InboxPersonKind;
  people: InboxPersonDto[];
  status: InboxThreadStatus;
  unreadCount: number;
  lastMessage: { text: string; at: string; from: InboxSender } | null;
  isDirectMessage: boolean;
  lastActivityAt: string;
}

export interface InboxMessageDto {
  id: string;
  from: InboxSender;
  /** Set on messages from a human. */
  senderKind?: InboxPersonKind;
  senderName?: string;
  text: string;
  attachments?: Array<{ type?: string; name?: string; mimeType?: string }>;
  interaction?: { id: string; kind: string; status?: string };
  at: string;
}

export interface ListInboxResponseDto {
  data: InboxThreadDto[];
  next: string | null;
}

export interface GetInboxThreadResponseDto {
  thread: InboxThreadDto;
  messages: InboxMessageDto[];
  hasMore: boolean;
}

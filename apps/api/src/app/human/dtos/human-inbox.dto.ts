import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Longest a `?wait=` long-poll holds the request, so it stays under proxy and load-balancer timeouts. */
export const HUMAN_INBOX_MAX_WAIT_SECONDS = 25;

export const INBOX_READ_FILTERS = ['unread', 'read', 'all'] as const;
export type InboxReadFilter = (typeof INBOX_READ_FILTERS)[number];

export const INBOX_STATUS_FILTERS = ['open', 'resolved', 'all'] as const;
export type InboxStatusFilter = (typeof INBOX_STATUS_FILTERS)[number];

export const INBOX_SENDERS_FILTERS = ['contacts', 'all'] as const;
export type InboxSendersFilter = (typeof INBOX_SENDERS_FILTERS)[number];

/** The tabs of the inbox page. `waiting` is every thread waiting on a person or on the agent. */
export const INBOX_TABS = ['all', 'unread', 'waiting', 'resolved'] as const;
export type InboxTab = (typeof INBOX_TABS)[number];

export const INBOX_THREAD_INCLUDES = ['system'] as const;
export type InboxThreadInclude = (typeof INBOX_THREAD_INCLUDES)[number];

export const INBOX_SEARCH_MAX_LENGTH = 200;

/** The filters the thread list and its counts share. */
export class InboxViewQueryDto {
  @ApiPropertyOptional({
    enum: INBOX_TABS,
    description:
      'One tab of the inbox page, in place of `filter` and `status`: every thread, the unread ones, the ones waiting on someone, or the resolved ones.',
  })
  @IsOptional()
  @IsIn(INBOX_TABS)
  tab?: InboxTab;

  @ApiPropertyOptional({ description: 'Only threads on this channel, such as `telegram`, `slack` or `email`.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  channel?: string;

  @ApiPropertyOptional({
    maxLength: INBOX_SEARCH_MAX_LENGTH,
    description: 'Only threads where the subject, a person’s name or a message contains this text.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(INBOX_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({
    enum: INBOX_SENDERS_FILTERS,
    default: 'contacts',
    description: 'Threads a contact has written in, or every thread including those from strangers.',
  })
  @IsOptional()
  @IsIn(INBOX_SENDERS_FILTERS)
  senders?: InboxSendersFilter;

  @ApiPropertyOptional({ description: 'Relay agent whose threads to list. Defaults to `human-relay`.' })
  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}

export class ListInboxQueryDto extends InboxViewQueryDto {
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

  @ApiPropertyOptional({
    enum: INBOX_THREAD_INCLUDES,
    description: '`system` adds the system lines of the thread, such as "resolved", between the messages.',
  })
  @IsOptional()
  @IsIn(INBOX_THREAD_INCLUDES)
  include?: InboxThreadInclude;

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

/**
 * Where an open thread stands, on top of `status`:
 * - `unread`: someone wrote and the agent has not attended to it;
 * - `waiting_on_person`: the agent asked something that nobody has answered yet;
 * - `waiting_on_you`: a person did the last thing in the thread and the agent has not sent anything since;
 * - `open`: none of the above;
 * - `resolved`: the host declared the thread finished.
 */
export type InboxThreadState = 'unread' | 'waiting_on_person' | 'waiting_on_you' | 'open' | 'resolved';

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
  state: InboxThreadState;
  /** Set while `state` is `waiting_on_person`: who may answer the oldest open question. Empty when anyone may. */
  waitingOn?: InboxPersonDto[];
  /** Who the thread is with: the names of its people, or their ids where a name is unknown. */
  from: string;
  subject: string;
  /** The newest message, shortened. */
  preview: string;
  unreadCount: number;
  lastMessage: { text: string; at: string; from: InboxSender } | null;
  isDirectMessage: boolean;
  openedAt: string;
  /** When the agent last read the thread, or null if it never did. */
  lastReadAt: string | null;
  lastActivityAt: string;
}

export interface InboxAttachmentDto {
  type?: string;
  name?: string;
  mimeType?: string;
  /** In bytes. */
  size?: number;
}

/** `card` is a card without controls: Block Kit blocks on Slack. `text` is a plain message. */
export type InboxCardPresentationStyle = 'buttons' | 'reply' | 'card' | 'text';

export interface InboxCardStateDto {
  status: string;
  /** Ready to show, without the time: "waiting for Maya", "Approved by Omer in Slack", "no reply needed". */
  label: string;
  /** Set while the card waits: who may answer. Empty when anyone in the thread may. */
  waitingOn?: InboxPersonDto[];
  /** Set once a person settled the card. */
  respondedBy?: { id?: string; name: string };
  respondedAt?: string;
  /** The picked option or pressed button. */
  optionId?: string;
  optionLabel?: string;
  /** The reply to an `ask`. */
  text?: string;
}

/** A `tell`, `ask`, `approve` or `choose` as it was sent, and what became of it. */
export interface InboxCardDto {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  body?: string;
  icon?: string;
  /** The `--from` attribution, when the host gave one. */
  requestedBy?: string;
  /** `approve`: the buttons, in the order they are shown. */
  buttons?: Array<{ id: string; label: string }>;
  /** `choose`: the options. */
  options?: Array<{ id: string; label: string }>;
  /** How the channel shows the card: "Telegram buttons", "Slack reply", "Slack blocks". */
  presentation: { channel: string; style: InboxCardPresentationStyle; label: string };
  state: InboxCardStateDto;
  expiresAt: string;
}

export interface InboxMessageDto {
  id: string;
  from: InboxSender;
  /** `in` from a person, `out` from the agent. Absent on a system line. */
  direction?: 'in' | 'out';
  /** Set on messages from a human. */
  senderKind?: InboxPersonKind;
  senderName?: string;
  /** Who sent it, with the agent's name on its own messages. Absent on a system line. */
  sender?: { id?: string; name?: string; kind: InboxPersonKind | 'agent' };
  channel: string;
  text: string;
  attachments?: InboxAttachmentDto[];
  interaction?: { id: string; kind: string; status?: string };
  /** Set on the one row a `tell`, `ask`, `approve` or `choose` has in the thread. */
  card?: InboxCardDto;
  at: string;
}

export interface ListInboxResponseDto {
  data: InboxThreadDto[];
  next: string | null;
}

/** The "Details" block of a thread. */
export interface InboxThreadDetailsDto {
  threadId: string;
  channel: string;
  /** The first contact in the thread, or its first stranger when it has no contact. */
  contact: (InboxPersonDto & { verified: boolean }) | null;
  status: InboxThreadState;
  openedAt: string;
  lastReadAt: string | null;
  /** The agent whose inbox this is: who "read by" refers to. */
  agent: { identifier: string; name: string };
  messageCount: number;
}

export interface GetInboxThreadResponseDto {
  thread: InboxThreadDto;
  messages: InboxMessageDto[];
  hasMore: boolean;
  details: InboxThreadDetailsDto;
}

export interface InboxCountsResponseDto {
  /** Per tab, within the chosen channel and search. */
  tabs: Record<InboxTab, number>;
  /** Per channel, within the chosen tab and search. `all` is every channel together. */
  channels: { all: number; [channel: string]: number };
  /** True when the inbox has more threads than were counted, so the numbers are a lower bound. */
  capped: boolean;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
    description:
      'Identifier of the newest message already read: the page is the messages that came after it, and `hasMore` says more came after those. Not together with `before`.',
  })
  @IsOptional()
  @IsString()
  after?: string;

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

export class InboxPersonDto {
  @ApiProperty({
    description:
      "The contact's subscriberId. A stranger has no subscriber, so theirs is the channel's own id for them.",
  })
  id: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty({ enum: ['contact', 'stranger'] })
  kind: InboxPersonKind;
}

export class InboxLastMessageDto {
  @ApiProperty()
  text: string;

  @ApiProperty()
  at: string;

  @ApiProperty({ enum: ['human', 'agent', 'system'] })
  from: InboxSender;
}

export class InboxThreadDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  channel: string;

  @ApiProperty({ enum: ['contact', 'stranger'], description: '`contact` once at least one contact is in the thread.' })
  kind: InboxPersonKind;

  @ApiProperty({ type: [InboxPersonDto] })
  people: InboxPersonDto[];

  @ApiProperty({ enum: ['open', 'resolved'] })
  status: InboxThreadStatus;

  @ApiProperty({
    enum: ['unread', 'waiting_on_person', 'waiting_on_you', 'open', 'resolved'],
    description: 'Where an open thread stands: unread, waiting on a person, waiting on the agent, open, or resolved.',
  })
  state: InboxThreadState;

  @ApiPropertyOptional({
    type: [InboxPersonDto],
    description:
      'Set while `state` is `waiting_on_person`: who may answer the oldest open question. Empty when anyone may.',
  })
  waitingOn?: InboxPersonDto[];

  @ApiProperty({
    description: 'Who the thread is with: the names of its people, or their ids where a name is unknown.',
  })
  from: string;

  @ApiProperty()
  subject: string;

  @ApiProperty({ description: 'The newest message, shortened.' })
  preview: string;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty({ type: InboxLastMessageDto, nullable: true })
  lastMessage: InboxLastMessageDto | null;

  @ApiPropertyOptional({ description: 'The address on the other side of an email thread. Missing for chat.' })
  fromAddress?: string;

  @ApiProperty()
  isDirectMessage: boolean;

  @ApiProperty()
  openedAt: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'When the agent last read the thread, or null if it never did.',
  })
  lastReadAt: string | null;

  @ApiProperty()
  lastActivityAt: string;
}

export class InboxAttachmentDto {
  @ApiPropertyOptional()
  type?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'In bytes.' })
  size?: number;
}

/** `card` is a card without controls: Block Kit blocks on Slack. `text` is a plain message. */
export type InboxCardPresentationStyle = 'buttons' | 'reply' | 'card' | 'text';

export class InboxCardResponderDto {
  @ApiPropertyOptional()
  id?: string;

  @ApiProperty()
  name: string;
}

export class InboxCardStateDto {
  @ApiProperty()
  status: string;

  @ApiProperty({
    description: 'Ready to show, without the time: "waiting for Maya", "Approved by Omer in Slack", "no reply needed".',
  })
  label: string;

  @ApiPropertyOptional({
    type: [InboxPersonDto],
    description: 'Set while the card waits: who may answer. Empty when anyone in the thread may.',
  })
  waitingOn?: InboxPersonDto[];

  @ApiPropertyOptional({ type: InboxCardResponderDto, description: 'Set once a person settled the card.' })
  respondedBy?: InboxCardResponderDto;

  @ApiPropertyOptional()
  respondedAt?: string;

  @ApiPropertyOptional({ description: 'The picked option or pressed button.' })
  optionId?: string;

  @ApiPropertyOptional()
  optionLabel?: string;

  @ApiPropertyOptional({ description: 'The reply to an `ask`.' })
  text?: string;
}

export class InboxCardChoiceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string;
}

export class InboxCardPresentationDto {
  @ApiProperty()
  channel: string;

  @ApiProperty({ enum: ['buttons', 'reply', 'card', 'text'] })
  style: InboxCardPresentationStyle;

  @ApiProperty({ description: 'How the channel shows the card: "Telegram buttons", "Slack reply", "Slack blocks".' })
  label: string;
}

/** A `tell`, `ask`, `approve` or `choose` as it was sent, and what became of it. */
export class InboxCardDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  kind: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  subtitle?: string;

  @ApiPropertyOptional()
  body?: string;

  @ApiPropertyOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'The `--from` attribution, when the host gave one.' })
  requestedBy?: string;

  @ApiPropertyOptional({
    type: [InboxCardChoiceDto],
    description: '`approve`: the buttons, in the order they are shown.',
  })
  buttons?: InboxCardChoiceDto[];

  @ApiPropertyOptional({ type: [InboxCardChoiceDto], description: '`choose`: the options.' })
  options?: InboxCardChoiceDto[];

  @ApiProperty({ type: InboxCardPresentationDto })
  presentation: InboxCardPresentationDto;

  @ApiProperty({ type: InboxCardStateDto })
  state: InboxCardStateDto;

  @ApiProperty()
  expiresAt: string;
}

export class InboxMessageSenderDto {
  @ApiPropertyOptional()
  id?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty({ enum: ['contact', 'stranger', 'agent'] })
  kind: InboxPersonKind | 'agent';
}

export class InboxMessageInteractionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  kind: string;

  @ApiPropertyOptional()
  status?: string;
}

export class InboxMessageDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['human', 'agent', 'system'] })
  from: InboxSender;

  @ApiPropertyOptional({
    enum: ['in', 'out'],
    description: '`in` from a person, `out` from the agent. Absent on a system line.',
  })
  direction?: 'in' | 'out';

  @ApiPropertyOptional({ enum: ['contact', 'stranger'], description: 'Set on messages from a human.' })
  senderKind?: InboxPersonKind;

  @ApiPropertyOptional()
  senderName?: string;

  @ApiPropertyOptional({
    type: InboxMessageSenderDto,
    description: "Who sent it, with the agent's name on its own messages. Absent on a system line.",
  })
  sender?: InboxMessageSenderDto;

  @ApiProperty()
  channel: string;

  @ApiProperty()
  text: string;

  @ApiPropertyOptional({ type: [InboxAttachmentDto] })
  attachments?: InboxAttachmentDto[];

  @ApiPropertyOptional({ type: InboxMessageInteractionDto })
  interaction?: InboxMessageInteractionDto;

  @ApiPropertyOptional({
    type: InboxCardDto,
    description: 'Set on the one row a `tell`, `ask`, `approve` or `choose` has in the thread.',
  })
  card?: InboxCardDto;

  @ApiProperty()
  at: string;
}

export class ListInboxResponseDto {
  @ApiProperty({ type: [InboxThreadDto] })
  data: InboxThreadDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Cursor for the next page, or null when this is the last page.',
  })
  next: string | null;
}

export class InboxThreadContactDto extends InboxPersonDto {
  @ApiProperty()
  verified: boolean;
}

export class InboxThreadAgentDto {
  @ApiProperty()
  identifier: string;

  @ApiProperty()
  name: string;
}

/** The "Details" block of a thread. */
export class InboxThreadDetailsDto {
  @ApiProperty()
  threadId: string;

  @ApiProperty()
  channel: string;

  @ApiProperty({
    type: InboxThreadContactDto,
    nullable: true,
    description: 'The first contact in the thread, or its first stranger when it has no contact.',
  })
  contact: InboxThreadContactDto | null;

  @ApiProperty({ enum: ['unread', 'waiting_on_person', 'waiting_on_you', 'open', 'resolved'] })
  status: InboxThreadState;

  @ApiProperty()
  openedAt: string;

  @ApiProperty({ type: String, nullable: true })
  lastReadAt: string | null;

  @ApiProperty({ type: InboxThreadAgentDto, description: 'The agent whose inbox this is: who "read by" refers to.' })
  agent: InboxThreadAgentDto;

  @ApiProperty()
  messageCount: number;
}

export class GetInboxThreadResponseDto {
  @ApiProperty({ type: InboxThreadDto })
  thread: InboxThreadDto;

  @ApiProperty({ type: [InboxMessageDto], description: 'Oldest first.' })
  messages: InboxMessageDto[];

  @ApiProperty({ description: 'More messages lie past this page: older ones, or with `after`, newer ones.' })
  hasMore: boolean;

  @ApiProperty({ type: InboxThreadDetailsDto })
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

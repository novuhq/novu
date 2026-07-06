import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Mirrors WEB_CONVERSATION_ID_PATTERN in @novu/chat-adapter-web (colon-free thread-id segment). */
export const WEB_CONVERSATION_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

const MAX_MESSAGE_TEXT_LENGTH = 10_000;

export class SendWebMessageRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_MESSAGE_TEXT_LENGTH)
  text: string;

  /**
   * Client-generated idempotency key for the message; becomes the inbound
   * platformMessageId so retries deduplicate server-side.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,64}$/)
  clientMessageId?: string;
}

export class SendWebActionRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  actionId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  value?: string;

  /** Platform message id of the message carrying the actioned card. */
  @IsOptional()
  @IsString()
  @MaxLength(256)
  sourceMessageId?: string;
}

export type WebMessagePartDto =
  | { type: 'text'; markdown: string }
  | { type: 'card'; card: Record<string, unknown> }
  | {
      type: 'toolApproval';
      approvalId: string;
      toolCallId?: string;
      toolName?: string;
      input?: Record<string, unknown>;
      status: 'pending' | 'approved' | 'denied';
    }
  | { type: 'file'; filename?: string; mimeType?: string; size?: number; url: string };

export interface WebConversationMessageDto {
  id: string;
  role: 'user' | 'agent';
  parts: WebMessagePartDto[];
  senderName?: string;
  createdAt: string;
  isEdited?: boolean;
}

export interface WebConversationDto {
  /** The client-facing conversation id (the segment embedded in the thread id). */
  id: string;
  title: string;
  status: string;
  lastMessagePreview?: string;
  messageCount: number;
  createdAt: string;
  lastActivityAt: string;
}

export interface WebConversationListResponseDto {
  data: WebConversationDto[];
  hasMore: boolean;
}

export interface WebConversationMessagesResponseDto {
  data: WebConversationMessageDto[];
  hasMore: boolean;
}

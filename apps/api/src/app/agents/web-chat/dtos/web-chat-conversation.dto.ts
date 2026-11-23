import { IsOptional, IsString } from 'class-validator';
import { withCursorPagination } from '../../../shared/dtos/cursor-paginated-response';
import { CursorPaginationQueryDto } from '../../shared/dtos/cursor-pagination-query.dto';

export class WebChatConversationMetadataDto {
  identifier: string;
  title: string;
  status: string;
  agentIdentifier: string;
  lastActivityAt: string;
  createdAt: string;
}

export class CancelWebChatConversationTurnBodyDto {
  /** The agent the client is talking to; when set, it must be the conversation's agent. */
  @IsOptional()
  @IsString()
  agentId?: string;

  /** Sent by the SDK on every web-chat call; a Stop does not depend on the published version. */
  @IsOptional()
  @IsString()
  agentHash?: string;
}

export class CancelWebChatConversationTurnResponseDto {
  /** `aborted` when a running turn was stopped (or already was), `idle` when nothing was running. */
  status: 'aborted' | 'idle';
}

export class ListWebChatConversationsQueryDto extends CursorPaginationQueryDto<
  WebChatConversationMetadataDto,
  'lastActivityAt' | 'createdAt'
> {}

export class ListWebChatConversationsResponseDto extends withCursorPagination(WebChatConversationMetadataDto, {
  description: 'List of web-chat conversations for the subscriber',
}) {}

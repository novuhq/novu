import { withCursorPagination } from '../../../shared/dtos/cursor-paginated-response';
import { CursorPaginationQueryDto } from '../../shared/dtos/cursor-pagination-query.dto';

export class AgentChatConversationMetadataDto {
  identifier: string;
  title: string;
  status: string;
  agentIdentifier: string;
  lastActivityAt: string;
  createdAt: string;
}

export class ListAgentChatConversationsQueryDto extends CursorPaginationQueryDto<
  AgentChatConversationMetadataDto,
  'lastActivityAt' | 'createdAt'
> {}

export class ListAgentChatConversationsResponseDto extends withCursorPagination(AgentChatConversationMetadataDto, {
  description: 'List of agent-chat conversations for the subscriber',
}) {}

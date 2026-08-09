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

export class ListWebChatConversationsQueryDto extends CursorPaginationQueryDto<
  WebChatConversationMetadataDto,
  'lastActivityAt' | 'createdAt'
> {}

export class ListWebChatConversationsResponseDto extends withCursorPagination(WebChatConversationMetadataDto, {
  description: 'List of web-chat conversations for the subscriber',
}) {}

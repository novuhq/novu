import { withCursorPagination } from '../../shared/dtos/cursor-paginated-response';
import { GetChannelConnectionResponseDto } from './get-channel-connection-response.dto';

export class ListChannelConnectionsResponseDto extends withCursorPagination(GetChannelConnectionResponseDto, {
  description: 'List of returned Channel Connections',
}) {}

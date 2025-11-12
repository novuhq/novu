import { withCursorPagination } from '../../shared/dtos/cursor-paginated-response';
import { GetChannelEndpointResponseDto } from './get-channel-endpoint-response.dto';

export class ListChannelEndpointsResponseDto extends withCursorPagination(GetChannelEndpointResponseDto, {
  description: 'List of returned Channel Endpoints',
}) {}

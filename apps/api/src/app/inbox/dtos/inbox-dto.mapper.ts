import { ChannelConnectionEntity, ChannelEndpointEntity } from '@novu/dal';
import { InboxChannelConnectionResponseDto } from './inbox-channel-connection-response.dto';
import { InboxChannelEndpointResponseDto } from './inbox-channel-endpoint-response.dto';

export function mapChannelConnectionToInboxDto(entity: ChannelConnectionEntity): InboxChannelConnectionResponseDto {
  return {
    identifier: entity.identifier,
  };
}

export function mapChannelEndpointToInboxDto(entity: ChannelEndpointEntity): InboxChannelEndpointResponseDto {
  return {
    identifier: entity.identifier,
    type: entity.type,
  };
}

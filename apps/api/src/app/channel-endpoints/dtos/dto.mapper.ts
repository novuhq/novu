import { ChannelEndpointEntity } from '@novu/dal';
import { GetChannelEndpointResponseDto } from './get-channel-endpoint-response.dto';

export function mapChannelEndpointEntityToDto(channelEndpoint: ChannelEndpointEntity): GetChannelEndpointResponseDto {
  return {
    identifier: channelEndpoint.identifier,
    channel: channelEndpoint.channel,
    providerId: channelEndpoint.providerId,
    integrationIdentifier: channelEndpoint.integrationIdentifier,
    connectionIdentifier: channelEndpoint.connectionIdentifier || null,
    subscriberId: channelEndpoint.subscriberId || null,
    contextKeys: channelEndpoint.contextKeys || [],
    type: channelEndpoint.type,
    endpoint: channelEndpoint.endpoint,
    createdAt: channelEndpoint.createdAt,
    updatedAt: channelEndpoint.updatedAt,
  };
}

import { ChannelEndpointEntity } from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { GetChannelEndpointResponseDto } from './get-channel-endpoint-response.dto';

export function mapChannelEndpointEntityToDto(channelEndpoint: ChannelEndpointEntity): GetChannelEndpointResponseDto {
  return {
    identifier: channelEndpoint.identifier,
    channel: channelEndpoint.channel,
    provider: channelEndpoint.providerId as ProvidersIdEnum,
    integrationIdentifier: channelEndpoint.integrationIdentifier,
    connectionIdentifier: channelEndpoint.connectionIdentifier || null,
    type: channelEndpoint.type,
    endpoint: channelEndpoint.endpoint,
    createdAt: channelEndpoint.createdAt,
    updatedAt: channelEndpoint.updatedAt,
  };
}

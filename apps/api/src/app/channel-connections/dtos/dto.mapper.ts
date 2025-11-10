import { ChannelConnectionEntity } from '@novu/dal';
import { GetChannelConnectionResponseDto } from './get-channel-connection-response.dto';

export function mapChannelConnectionEntityToDto(
  channelConnection: ChannelConnectionEntity
): GetChannelConnectionResponseDto {
  return {
    identifier: channelConnection.identifier,
    channel: channelConnection.channel,
    providerId: channelConnection.providerId,
    integrationIdentifier: channelConnection.integrationIdentifier,
    resource: channelConnection.resource || null,
    contextKeys: channelConnection.contextKeys || [],
    workspace: channelConnection.workspace,
    auth: channelConnection.auth,
    createdAt: channelConnection.createdAt,
    updatedAt: channelConnection.updatedAt,
  };
}

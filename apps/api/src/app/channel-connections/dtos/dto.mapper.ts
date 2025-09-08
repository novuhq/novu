import { ChannelConnectionEntity } from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { GetChannelConnectionResponseDto } from './get-channel-connection-response.dto';

export function mapChannelConnectionEntityToDto(
  channelConnection: ChannelConnectionEntity
): GetChannelConnectionResponseDto {
  return {
    identifier: channelConnection.identifier,
    channel: channelConnection.channel,
    provider: channelConnection.providerId as ProvidersIdEnum,
    integrationIdentifier: channelConnection.integrationIdentifier,
    workspace: channelConnection.workspace,
    auth: channelConnection.auth,
    createdAt: channelConnection.createdAt,
    updatedAt: channelConnection.updatedAt,
  };
}

import { ChannelConnectionEntity } from '@novu/dal';
import { ConnectionMode } from '@novu/shared';
import { GetChannelConnectionResponseDto } from './get-channel-connection-response.dto';

/**
 * Maps a stored `ChannelConnectionEntity` into the public-facing response DTO.
 *
 * Secrets (`accessToken`, `refreshToken`, `signingSecret`, `clientSecret`) are
 * NEVER included in the response. The `auth` field is kept for SDK backward
 * compatibility but always returns an empty/redacted value. Use `connected` to
 * determine if credentials are present.
 */
export function mapChannelConnectionEntityToDto(
  channelConnection: ChannelConnectionEntity
): GetChannelConnectionResponseDto {
  const connectionMode: ConnectionMode = channelConnection.subscriberId ? 'subscriber' : 'shared';
  const connected = Boolean(channelConnection.auth?.accessToken);

  return {
    identifier: channelConnection.identifier,
    channel: channelConnection.channel,
    providerId: channelConnection.providerId,
    integrationIdentifier: channelConnection.integrationIdentifier,
    subscriberId: channelConnection.subscriberId || null,
    contextKeys: channelConnection.contextKeys || [],
    workspace: channelConnection.workspace,
    auth: { accessToken: '' },
    connected,
    connectionMode,
    createdAt: channelConnection.createdAt,
    updatedAt: channelConnection.updatedAt,
  };
}

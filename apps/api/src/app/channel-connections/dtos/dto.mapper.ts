import { decryptChannelConnectionAuth } from '@novu/application-generic';
import { ChannelConnectionEntity } from '@novu/dal';
import { GetChannelConnectionResponseDto } from './get-channel-connection-response.dto';

/**
 * Maps a stored `ChannelConnectionEntity` into the public-facing response DTO.
 *
 * `auth` is encrypted at rest (see `encryptChannelConnectionAuth` on the write path),
 * so we decrypt here to preserve the existing API contract — callers still receive the
 * plaintext access token they wrote. The decrypt helper is idempotent, so legacy
 * unencrypted records pass through unchanged.
 */
export function mapChannelConnectionEntityToDto(
  channelConnection: ChannelConnectionEntity
): GetChannelConnectionResponseDto {
  const decryptedAuth = decryptChannelConnectionAuth(channelConnection.auth);

  return {
    identifier: channelConnection.identifier,
    channel: channelConnection.channel,
    providerId: channelConnection.providerId,
    integrationIdentifier: channelConnection.integrationIdentifier,
    subscriberId: channelConnection.subscriberId || null,
    contextKeys: channelConnection.contextKeys || [],
    workspace: channelConnection.workspace,
    auth: {
      accessToken: decryptedAuth?.accessToken ?? '',
    },
    createdAt: channelConnection.createdAt,
    updatedAt: channelConnection.updatedAt,
  };
}

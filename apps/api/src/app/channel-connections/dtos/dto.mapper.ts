import { ChannelConnectionEntity } from '@novu/dal';
import { GetChannelConnectionResponseDto } from './get-channel-connection-response.dto';

/**
 * Maps a stored `ChannelConnectionEntity` into the public-facing response DTO.
 *
 * Crucially, the response NEVER echoes back the stored `auth.accessToken` — that value is a
 * provider bearer token (Slack / MS Teams / etc.) which would give any caller with
 * `INTEGRATION_READ` permission third-party platform access if exfiltrated.
 * Instead we expose a presence-only flag so the dashboard / SDK can render "Connected"
 * state without leaking the secret. To rotate the token, callers send a new value via PATCH.
 */
export function mapChannelConnectionEntityToDto(
  channelConnection: ChannelConnectionEntity
): GetChannelConnectionResponseDto {
  return {
    identifier: channelConnection.identifier,
    channel: channelConnection.channel,
    providerId: channelConnection.providerId,
    integrationIdentifier: channelConnection.integrationIdentifier,
    subscriberId: channelConnection.subscriberId || null,
    contextKeys: channelConnection.contextKeys || [],
    workspace: channelConnection.workspace,
    auth: {
      hasAccessToken: !!channelConnection.auth?.accessToken,
    },
    createdAt: channelConnection.createdAt,
    updatedAt: channelConnection.updatedAt,
  };
}

import { BadRequestException } from '@nestjs/common';
import {
  type ChannelConnectionAuth,
  decryptCredentials,
  isRotatingTokenProvider,
  normalizeRotatingAuth,
} from '@novu/application-generic';
import { IntegrationEntity } from '@novu/dal';
import { ChatProviderIdEnum, ConnectionMode, ContextPayload, ProvidersIdEnum } from '@novu/shared';
import { AuthDto } from '../dtos/shared.dto';

/**
 * Validates that the subscriber/context combination is consistent with the
 * requested connectionMode. Throws a BadRequestException when the caller
 * violates the scoping rules for the chosen mode.
 *
 * Note: subscriberId may be present even in "shared" mode (e.g. injected from
 * the subscriber JWT session). It is intentionally not rejected here — callers
 * are responsible for stripping it before storing or embedding it in state.
 *
 * Called from both CreateChannelConnection and GenerateSlackOauthUrl so the
 * rules are enforced in one place.
 */
export function validateConnectionMode({
  connectionMode,
  subscriberId,
  context,
  contextKeys,
}: {
  connectionMode?: ConnectionMode;
  subscriberId?: string;
  context?: ContextPayload;
  contextKeys?: string[];
}): void {
  // A session-validated context can arrive as pre-resolved keys instead of a raw
  // payload; either satisfies the "context present" requirement below.
  const hasContext = !!context || !!contextKeys?.length;

  if (connectionMode === 'shared') {
    if (!hasContext) {
      throw new BadRequestException('context is required when connectionMode is "shared"');
    }

    return;
  }

  if (connectionMode === 'subscriber') {
    if (!subscriberId) {
      throw new BadRequestException('subscriberId is required when connectionMode is "subscriber"');
    }

    return;
  }

  if (!subscriberId && !hasContext) {
    throw new BadRequestException('Either subscriberId or context must be provided');
  }
}

/**
 * Validates and normalizes channel-connection auth carrying a rotating `refreshToken`.
 *
 * Rotation only works for providers with a refresh implementation (Slack, Novu-managed
 * Slack, Webex), and the refresh call needs the integration's OAuth client credentials —
 * so a stored refresh token on any other provider, or without configured credentials, is
 * a config lie that would silently break later. Both are rejected here at write time.
 *
 * Auth without a `refreshToken` (legacy long-lived tokens) is returned unchanged.
 */
export function validateAndNormalizeConnectionAuth(auth: AuthDto, integration: IntegrationEntity): AuthDto {
  if (!auth.refreshToken) {
    return auth;
  }

  if (!isRotatingTokenProvider(integration.providerId as ProvidersIdEnum)) {
    throw new BadRequestException(
      `Token rotation is not supported for provider "${integration.providerId}". Remove refreshToken from the connection auth.`
    );
  }

  // The Novu-managed demo Slack integration stores no credentials on the document — its
  // OAuth client lives in env vars — so credential validation is skipped for it.
  if (integration.providerId !== ChatProviderIdEnum.Novu) {
    const credentials = integration.credentials ? decryptCredentials(integration.credentials) : undefined;

    if (!credentials?.clientId || !credentials?.secretKey) {
      throw new BadRequestException(
        `Integration "${integration.identifier}" must have clientId and secretKey configured to store a rotating refresh token.`
      );
    }
  }

  return normalizeRotatingAuth(auth as ChannelConnectionAuth & { accessToken: string }) as AuthDto;
}

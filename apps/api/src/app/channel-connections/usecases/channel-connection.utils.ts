import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  type ChannelConnectionAuth,
  decryptCredentials,
  isRotatingTokenProvider,
  normalizeRotatingAuth,
} from '@novu/application-generic';
import { ChannelConnectionEntity, IntegrationEntity } from '@novu/dal';
import { ChatProviderIdEnum, ConnectionMode, ContextPayload, createContextKey, ProvidersIdEnum } from '@novu/shared';
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
 * Guards an OAuth reconnect that names an existing connection by identifier, so a caller
 * can only replace the auth of a connection created for them. A connection with a
 * subscriber belongs to that subscriber in its exact context; a connection without one
 * belongs to its exact, non-empty context.
 */
export function assertCanReconnectChannelConnection(
  connection: Pick<ChannelConnectionEntity, 'identifier' | 'subscriberId' | 'contextKeys'>,
  caller: { subscriberId?: string; contextKeys: string[] }
): void {
  const connectionContextKeys = connection.contextKeys ?? [];
  const isSameContext = haveSameKeys(connectionContextKeys, caller.contextKeys);
  const canReconnect = connection.subscriberId
    ? connection.subscriberId === caller.subscriberId && isSameContext
    : connectionContextKeys.length > 0 && isSameContext;

  if (!canReconnect) {
    throw new ConflictException(
      `Channel connection "${connection.identifier}" already exists for a different subscriber or context`
    );
  }
}

/**
 * Context keys of an OAuth caller. Session-validated `contextKeys` win over the raw
 * `context` payload; keys are derived without touching the contexts collection.
 */
export function resolveCallerContextKeys(caller: { context?: ContextPayload; contextKeys?: string[] }): string[] {
  if (caller.contextKeys?.length) {
    return caller.contextKeys;
  }

  return Object.entries(caller.context ?? {}).flatMap(([type, value]) => {
    if (!value) {
      return [];
    }

    return [createContextKey(type, typeof value === 'string' ? value : value.id)];
  });
}

function haveSameKeys(left: string[], right: string[]): boolean {
  const rightKeys = new Set(right);

  return left.length === rightKeys.size && left.every((key) => rightKeys.has(key));
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

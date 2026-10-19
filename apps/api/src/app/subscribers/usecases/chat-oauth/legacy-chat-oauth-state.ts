import { BadRequestException } from '@nestjs/common';
import { createHash, encodeOAuthState, peekOAuthStatePayload, splitOAuthState } from '@novu/application-generic';
import { ChatProviderIdEnum } from '@novu/shared';
import { areHexDigestsEqual } from '../../../shared/helpers/timing-safe-equal';

/**
 * Signed `state` carried through the deprecated per-subscriber chat OAuth flow.
 *
 * The legacy flow derived every routing field from the callback's query string,
 * so anyone able to reach the callback could name an arbitrary environment and
 * subscriber. Signing the state with the environment's API key at the point the
 * OAuth URL is minted binds the callback to that exact hand-off, and lets the
 * subscriber HMAC hash survive the provider round trip — the redirect URI is
 * registered with the provider and cannot carry it.
 */
export type LegacyChatOauthStateData = {
  environmentId: string;
  subscriberId: string;
  providerId: ChatProviderIdEnum;
  integrationIdentifier?: string;
  hmacHash?: string;
  timestamp: number;
};

/**
 * Generous compared to the 5 minutes used by `POST /v1/integrations/chat/oauth`:
 * the legacy flow routinely includes a full provider sign-in and workspace
 * picker in the same hop, and expiring mid-install would be a regression.
 */
const STATE_TTL_MS = 15 * 60 * 1000;

export function encodeLegacyChatOauthState(data: LegacyChatOauthStateData, environmentApiKey: string): string {
  const payload = JSON.stringify(data);
  const signature = createHash(environmentApiKey, payload);

  if (!signature) {
    throw new BadRequestException('Failed to create OAuth state signature');
  }

  return encodeOAuthState(payload, signature);
}

export function peekLegacyChatOauthStateEnvironmentId(state: string): string {
  try {
    const { environmentId } = peekOAuthStatePayload<Partial<LegacyChatOauthStateData>>(state);

    if (!environmentId) {
      throw new Error('Missing environmentId');
    }

    return environmentId;
  } catch {
    throw new BadRequestException('Invalid OAuth state parameter');
  }
}

export function decodeLegacyChatOauthState(state: string, environmentApiKey: string): LegacyChatOauthStateData {
  let data: LegacyChatOauthStateData;

  try {
    const { payload, signature } = splitOAuthState(state);
    const expectedSignature = createHash(environmentApiKey, payload);

    if (!areHexDigestsEqual(expectedSignature, signature)) {
      throw new Error('Invalid state signature');
    }

    data = JSON.parse(payload) as LegacyChatOauthStateData;
  } catch {
    throw new BadRequestException('Invalid OAuth state parameter');
  }

  if (typeof data.timestamp !== 'number' || Date.now() - data.timestamp > STATE_TTL_MS) {
    throw new BadRequestException('OAuth state expired, please restart the authorization flow');
  }

  return data;
}

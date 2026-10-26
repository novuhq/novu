import { createHmac, hkdfSync } from 'node:crypto';
import { decryptApiKey } from '@novu/application-generic';
import { isHmacValidForAnyKey } from '../../shared/helpers/is-valid-hmac';
import { areHexDigestsEqual } from '../../shared/helpers/timing-safe-equal';

const DASHBOARD_WEB_CHAT_AGENT_KEY_INFO = 'novu-dashboard-web-chat-agent';

/**
 * Web chat `agentHash` for the dashboard tester. Signed with a key derived from the API key, so it can
 * never equal `createHash(apiKey, value)`: members without API key access can hold it without being able
 * to use it as a `subscriberHash` for a subscriber whose id matches an agent identifier.
 */
export function createDashboardWebChatAgentHash(apiKey: string, agentIdentifier: string): string {
  const derivedKey = Buffer.from(hkdfSync('sha256', apiKey, '', DASHBOARD_WEB_CHAT_AGENT_KEY_INFO, 32));

  return createHmac('sha256', derivedKey).update(agentIdentifier).digest('hex');
}

/**
 * Accepts both the `agentHash` customers sign with their API key and the dashboard tester's derived hash,
 * against every active API key of the environment.
 */
export function isWebChatAgentHashValidForAnyKey(
  secretKeys: string[],
  agentIdentifier: string,
  agentHash: string | undefined
): boolean {
  return (
    isHmacValidForAnyKey(secretKeys, agentIdentifier, agentHash) ||
    secretKeys.some((secretKey) =>
      areHexDigestsEqual(createDashboardWebChatAgentHash(decryptApiKey(secretKey), agentIdentifier), agentHash)
    )
  );
}

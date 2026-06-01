import { BadRequestException } from '@nestjs/common';
import { createHash, encodeOAuthState, splitOAuthState } from '@novu/application-generic';

/**
 * Public path mounted under `AgentsMcpOAuthController`. Receives the click on
 * the in-channel "Connect from provider" link, marks the connection row as
 * `connected` (the click itself is the user-intent signal, mirroring the
 * dashboard "Add from Claude" model), and 302s to the provider's vault UI.
 */
export const PROVIDER_MANAGED_REDIRECT_PATH = '/v1/agents/mcp/provider-managed/redirect';

/**
 * Signed payload that round-trips through the in-thread "Connect from provider"
 * link. Provider-managed MCPs have no Novu OAuth callback, so we use this
 * Novu-owned intermediate redirect as the user-intent signal: opening the link
 * is what flips the connection row to `connected`, immediately before we
 * forward the user to Claude's vault UI to finish OAuth.
 *
 * Lifetime is intentionally long (24h) — the user might leave the setup card
 * untouched in a Slack thread for a while before coming back to click. The
 * signed payload itself stays compact because we re-derive the Claude URL
 * from the state at click time, instead of round-tripping a full URL.
 */
export interface ProviderManagedRedirectState {
  /** Mongo `_id` of the `mcp_connection` row to promote on click. */
  connectionId: string;
  /** Mongo `Agent._id` for the agent the enablement belongs to. */
  agentId: string;
  /** Mongo `AgentMcpServer._id` for the enablement the connection backs. */
  agentMcpServerId: string;
  /** Mongo `Subscriber._id` (NOT the external channel subscriberId). */
  subscriberId: string;
  environmentId: string;
  organizationId: string;
  mcpId: string;
  /** Anthropic vault container id Novu provisioned for the subscriber. */
  externalVaultId: string;
  /** Optional Anthropic workspace id; falls back to the default workspace. */
  externalWorkspaceId?: string;
  /**
   * Conversation that originated the setup card. Round-tripped so the redirect
   * handler can drive `CompleteManagedAgentSetup` and replay the parked turn.
   */
  conversationId?: string;
  /** Issuance timestamp; verified against `PROVIDER_MANAGED_REDIRECT_TTL_MS`. */
  timestamp: number;
}

/** Maximum lifetime of a signed redirect link before re-issue is required. */
export const PROVIDER_MANAGED_REDIRECT_TTL_MS = 24 * 60 * 60 * 1000;

export function signProviderManagedRedirectState(payload: ProviderManagedRedirectState, apiKey: string): string {
  const jsonPayload = JSON.stringify(payload);
  const signature = createHash(apiKey, jsonPayload);

  if (!signature) {
    throw new Error('Failed to sign provider-managed redirect state.');
  }

  return encodeOAuthState(jsonPayload, signature);
}

export function decodeProviderManagedRedirectState(state: string): {
  payload: ProviderManagedRedirectState;
  rawPayload: string;
  signature: string;
} {
  let parts: { payload: string; signature: string };
  try {
    parts = splitOAuthState(state);
  } catch {
    throw new BadRequestException('Invalid provider-managed redirect state.');
  }

  let payload: ProviderManagedRedirectState;
  try {
    payload = JSON.parse(parts.payload) as ProviderManagedRedirectState;
  } catch {
    throw new BadRequestException('Invalid provider-managed redirect state.');
  }

  if (
    !payload.connectionId ||
    !payload.agentId ||
    !payload.agentMcpServerId ||
    !payload.subscriberId ||
    !payload.environmentId ||
    !payload.organizationId ||
    !payload.mcpId ||
    !payload.externalVaultId ||
    typeof payload.timestamp !== 'number'
  ) {
    throw new BadRequestException('Provider-managed redirect state missing required fields.');
  }

  return { payload, rawPayload: parts.payload, signature: parts.signature };
}

export function buildProviderManagedRedirectUrl(signedState: string): string {
  const rootUrl = process.env.AGENT_API_HOSTNAME?.trim() || process.env.API_ROOT_URL?.trim();
  if (!rootUrl) {
    throw new Error('AGENT_API_HOSTNAME or API_ROOT_URL environment variable is required');
  }

  const baseUrl = rootUrl.replace(/\/$/, '');

  return `${baseUrl}${PROVIDER_MANAGED_REDIRECT_PATH}?state=${encodeURIComponent(signedState)}`;
}

import { cursorOAuthClient } from "./cursor";
import type { DcrRequestBody } from "./types";

/** Registered MCP OAuth clients — add new entries here (e.g. claude.ts). */
const MCP_OAUTH_CLIENTS = [cursorOAuthClient] as const;

/**
 * Return a static DCR registration document when the request matches a known
 * MCP client (redirect URIs ⊆ that client's allowlist) and its
 * `MCP_OAUTH_CLIENT_ID_*` env var is set. Otherwise callers forward to Clerk DCR.
 */
export function resolveStaticDcrRegistration(
	env: Env,
	body: DcrRequestBody,
): Record<string, unknown> | null {
	for (const client of MCP_OAUTH_CLIENTS) {
		const clientId = client.resolveClientId(env);
		if (clientId && client.matches(body)) {
			return client.buildRegistration(clientId);
		}
	}
	return null;
}

export { cursorOAuthClient, isCursorDcr } from "./cursor";
export type { DcrRequestBody, McpOAuthClient } from "./types";

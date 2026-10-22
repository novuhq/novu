import { mergeOAuthScopes } from "../scopes";
import type { DcrRequestBody, McpOAuthClient } from "./types";

/**
 * Stable Cursor OAuth callbacks eligible for the static client.
 * Requests that include any other redirect URI (e.g. loopback) use real DCR.
 */
export const CURSOR_REDIRECT_URIS = [
	"cursor://anysphere.cursor-mcp/oauth/callback",
	"https://www.cursor.com/agents/mcp/oauth/callback",
] as const;

const CURSOR_REDIRECT_URI_SET = new Set<string>(CURSOR_REDIRECT_URIS);

function normalizeRedirectUri(uri: string): string {
	return uri.replace(/\/+$/, "");
}

/**
 * Static Cursor client only when every requested redirect URI is in the known
 * set. Any unknown / missing callback falls through to real DCR.
 */
export function isCursorDcr(body: DcrRequestBody): boolean {
	if (!Array.isArray(body.redirect_uris) || body.redirect_uris.length === 0) {
		return false;
	}

	return body.redirect_uris.every(
		(uri) => typeof uri === "string" && CURSOR_REDIRECT_URI_SET.has(normalizeRedirectUri(uri)),
	);
}

export const cursorOAuthClient: McpOAuthClient = {
	buildRegistration(clientId) {
		return {
			client_id: clientId,
			client_id_issued_at: Math.floor(Date.now() / 1000),
			client_name: "Novu MCP (Cursor)",
			client_secret_expires_at: 0,
			grant_types: ["authorization_code"],
			redirect_uris: [...CURSOR_REDIRECT_URIS],
			response_types: ["code"],
			scope: mergeOAuthScopes(undefined),
			token_endpoint_auth_method: "none",
		};
	},
	matches: isCursorDcr,
	resolveClientId(env) {
		const clientId = env.MCP_OAUTH_CLIENT_ID_CURSOR?.trim();
		return clientId || null;
	},
};

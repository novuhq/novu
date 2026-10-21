export const PRM_PATH = "/.well-known/oauth-protected-resource";
export const DCR_PATH = "/oauth/register";
export const AS_METADATA_PATHS = [
	"/.well-known/oauth-authorization-server",
	"/.well-known/openid-configuration",
] as const;

export const DISCOVERY_CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Headers": "Authorization, Content-Type, mcp-protocol-version",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Max-Age": "86400",
};

export const MCP_CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Headers":
		"Authorization, Content-Type, mcp-session-id, mcp-protocol-version",
	"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Expose-Headers": "mcp-session-id",
	"Access-Control-Max-Age": "86400",
};

/**
 * Per-request OAuth context. `issuer` is the Clerk authorization server this
 * deployment proxies to, sourced from the `CLERK_OAUTH_ISSUER` secret. When it
 * is `null` the deployment has no OAuth configured (self-hosted mode): the
 * discovery endpoints 404 and 401 challenges omit the OAuth metadata so clients
 * fall back to API-key auth. `origin`/`resource`/`prmUrl` are derived from the
 * request URL (each deployment is pinned to a single host).
 */
export type OAuthContext = {
	origin: string;
	resource: string;
	prmUrl: string;
	issuer: string | null;
};

function resolveIssuer(env: Env): string | null {
	const issuer = env.CLERK_OAUTH_ISSUER?.trim();
	return issuer ? issuer.replace(/\/+$/, "") : null;
}

export function resolveOrigin(request: Request): string {
	return new URL(request.url).origin.replace(/\/+$/, "");
}

export function resolveOAuthContext(env: Env, request: Request): OAuthContext {
	const origin = resolveOrigin(request);
	return {
		issuer: resolveIssuer(env),
		// RFC 9728: PRM `resource` must exactly match the MCP endpoint URL.
		origin,
		prmUrl: `${origin}${PRM_PATH}`,
		resource: origin,
	};
}

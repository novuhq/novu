import type { McpAuthOptions } from "@clerk/mcp-tools/hono";
import { OAUTH_SCOPES } from "./scopes";

export const PRM_PATH = "/.well-known/oauth-protected-resource";
export const AS_METADATA_PATHS = [
	"/.well-known/oauth-authorization-server",
	"/.well-known/openid-configuration",
] as const;

export const DISCOVERY_CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Headers": "Authorization, Content-Type, mcp-protocol-version",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Max-Age": "86400",
};

export const MCP_CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Headers":
		"Authorization, Content-Type, mcp-session-id, mcp-protocol-version",
	"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
	"Access-Control-Allow-Origin": "*",
	// Browser-based MCP clients can only start sign-in if they can read the challenge.
	"Access-Control-Expose-Headers": "mcp-session-id, WWW-Authenticate",
	"Access-Control-Max-Age": "86400",
};

/**
 * OAuth is on when the deployment has the keys of the Clerk instance that
 * issues its tokens: `CLERK_PUBLISHABLE_KEY` names the authorization server
 * (Clerk's Frontend API), `CLERK_SECRET_KEY` verifies tokens. Without both the
 * deployment is API-key only (self-hosted mode): the discovery endpoints 404
 * and the 401 challenge carries no OAuth metadata.
 */
export function isOAuthEnabled(env: Env): boolean {
	return Boolean(env.CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY);
}

/**
 * Options shared by `mcpAuth` and the protected resource metadata, so the
 * metadata lists the scopes the challenge asks for. Each deployment is pinned
 * to one host, so the resource is the origin of the request.
 */
export function clerkAuthOptions(origin: string): McpAuthOptions {
	return {
		challengeScopes: [...OAUTH_SCOPES],
		// An unauthenticated `initialize` would open a Durable Object session with
		// no credential, so every MCP request needs a token.
		discoverable: false,
		// RFC 9728: the resource is the MCP endpoint, which is the origin root.
		// Clerk accepts a token whose `aud` is this URL with or without the slash.
		resourceUrl: origin,
	};
}

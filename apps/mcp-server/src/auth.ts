import {
	authorizationServerMetadataHandler,
	type McpAuthOptions,
	mcpAuth,
	protectedResourceMetadataHandler,
} from "@clerk/mcp-tools/hono";
import type { Context, MiddlewareHandler } from "hono";
import { isOAuthToken, NovuApiUtils } from "./utils/api";

/** `token` is the credential the Durable Object session relays to the Novu API. */
export type AppEnv = { Bindings: Env; Variables: { token: string | null } };

// Scopes the 401 challenge asks for, and the protected resource metadata
// lists. user:org:read first so clients that truncate scope lists still pick
// it up: it makes the consent screen ask which organization to act for.
export const OAUTH_SCOPES = ["user:org:read", "email", "profile", "offline_access"] as const;

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
 * metadata lists the scopes the challenge asks for.
 */
function clerkAuthOptions(origin: string): McpAuthOptions {
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

/**
 * One Clerk handler per origin the Worker answers on (its custom domain, and
 * localhost in `wrangler dev`), since the origin is the resource.
 */
function perOrigin<T>(build: (origin: string) => T): (c: Context) => T {
	const built = new Map<string, T>();
	return (c) => {
		const { origin } = new URL(c.req.url);
		let value = built.get(origin);
		if (value === undefined) {
			value = build(origin);
			built.set(origin, value);
		}
		return value;
	};
}

const clerkAuthFor = perOrigin((origin) => mcpAuth(clerkAuthOptions(origin)));
const protectedResourceMetadataFor = perOrigin((origin) =>
	protectedResourceMetadataHandler(clerkAuthOptions(origin)),
);

/** Points clients at Clerk, which handles registration, consent and tokens. */
export const protectedResourceMetadata = (c: Context<AppEnv>) => protectedResourceMetadataFor(c)(c);

/** Clerk's own metadata, for clients that look for it on the MCP host. */
export const authorizationServerMetadata = authorizationServerMetadataHandler();

export const requireOAuth: MiddlewareHandler<AppEnv> = async (c, next) =>
	isOAuthEnabled(c.env) ? next() : oauthDisabledResponse();

function oauthDisabledResponse(): Response {
	return Response.json(
		{ error: "not_found", error_description: "OAuth is not enabled on this deployment" },
		{ status: 404 },
	);
}

/**
 * 401 for a missing or rejected API key. It carries no OAuth metadata, so a
 * client that presented an API key never starts the OAuth flow.
 */
function apiKeyUnauthorizedResponse(): Response {
	return Response.json(
		{ error: "unauthorized", error_description: "Authorization required" },
		{ headers: { "WWW-Authenticate": "Bearer" }, status: 401 },
	);
}

function serviceUnavailableResponse(): Response {
	return Response.json(
		{
			error: "service_unavailable",
			error_description:
				"Unable to verify credentials — Novu API is unreachable. Please retry shortly.",
		},
		{ status: 503 },
	);
}

/** Reads a bearer token the way Clerk's `mcpAuth` does: any case, any whitespace. */
function readBearerToken(header: string | undefined): string | null {
	const [scheme, token, ...rest] = (header ?? "").trim().split(/\s+/);
	return scheme?.toLowerCase() === "bearer" && token && rest.length === 0 ? token : null;
}

function isInitializeRequest(bodyText: string): boolean {
	try {
		const parsed = JSON.parse(bodyText);
		const messages = Array.isArray(parsed) ? parsed : [parsed];
		return messages.some((m) => m && typeof m === "object" && m.method === "initialize");
	} catch {
		return false;
	}
}

/**
 * Validates an API key against the live Novu API at initialize time so a bad
 * key fails fast. Reads a copy of the body, so the request forwards unchanged.
 */
async function probeApiKey(
	request: Request,
	token: string,
	apiUrl: string,
): Promise<Response | null> {
	if (request.method !== "POST" || !isInitializeRequest(await request.clone().text())) {
		return null;
	}

	try {
		const response = await NovuApiUtils.fetchCurrentUser(token, apiUrl);
		if (response.status === 401 || response.status === 403) return apiKeyUnauthorizedResponse();
		if (!response.ok) return serviceUnavailableResponse();
	} catch {
		return serviceUnavailableResponse();
	}

	return null;
}

/**
 * Decides how the request authenticates and sets `token` for the session.
 * Clerk's `mcpAuth` verifies OAuth access tokens, audience included, and sends
 * the 401 challenge when there is no token. Novu API keys share the `Bearer`
 * scheme, so any token that isn't a Clerk OAuth token is probed against the
 * Novu API instead; with OAuth off, that is every token.
 */
export const authenticate: MiddlewareHandler<AppEnv> = async (c, next) => {
	const token = readBearerToken(c.req.header("authorization"));

	if (isOAuthEnabled(c.env) && (!token || isOAuthToken(token))) {
		return clerkAuthFor(c)(c, async () => {
			c.set("token", c.get("mcpAuth")?.token ?? null);
			await next();
		});
	}

	if (!token) {
		return apiKeyUnauthorizedResponse();
	}

	const rejection = await probeApiKey(c.req.raw, token, c.env.NOVU_API_URL);
	if (rejection) {
		return rejection;
	}

	c.set("token", token);
	return next();
};

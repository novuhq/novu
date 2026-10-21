import { resolveStaticDcrRegistration } from "./clients";
import type { OAuthContext } from "./context";
import { DCR_PATH } from "./context";
import {
	DISCOVERY_CORS_HEADERS,
	discoveryJsonResponse,
	discoveryOptionsResponse,
	oauthDisabledResponse,
} from "./responses";
import { mergeOAuthScopes } from "./scopes";

function prepareDcrBody(body: Record<string, unknown>): Record<string, unknown> {
	return {
		...body,
		scope: mergeOAuthScopes(body.scope),
		// MCP clients must be public (PKCE); some send client_secret_basic by mistake.
		token_endpoint_auth_method: "none",
	};
}

async function forwardDcrToClerk(
	body: Record<string, unknown>,
	ctx: OAuthContext,
): Promise<Response> {
	try {
		const upstream = await fetch(`${ctx.issuer}${DCR_PATH}`, {
			body: JSON.stringify(prepareDcrBody(body)),
			headers: {
				accept: "application/json",
				"Content-Type": "application/json",
			},
			method: "POST",
		});
		return new Response(await upstream.text(), {
			headers: { "Content-Type": "application/json", ...DISCOVERY_CORS_HEADERS },
			status: upstream.status,
		});
	} catch {
		return discoveryJsonResponse(
			{
				error: "server_error",
				error_description: "Failed to forward client registration to Clerk",
			},
			502,
		);
	}
}

export async function handleDynamicClientRegistration(
	request: Request,
	ctx: OAuthContext,
	env: Env,
): Promise<Response> {
	if (request.method === "OPTIONS") {
		return discoveryOptionsResponse();
	}

	if (ctx.issuer === null) {
		return oauthDisabledResponse();
	}

	if (request.method !== "POST") {
		return discoveryJsonResponse({ error: "method_not_allowed" }, 405);
	}

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return discoveryJsonResponse({ error: "invalid_request" }, 400);
	}

	const staticRegistration = resolveStaticDcrRegistration(env, body);
	if (staticRegistration) {
		return discoveryJsonResponse(staticRegistration, 201);
	}

	return forwardDcrToClerk(body, ctx);
}

import type { OAuthContext } from "./context";
import { DISCOVERY_CORS_HEADERS, MCP_CORS_HEADERS } from "./context";
import { OAUTH_SCOPE_PARAM } from "./scopes";

export function discoveryJsonResponse(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		headers: { "Content-Type": "application/json", ...DISCOVERY_CORS_HEADERS },
		status,
	});
}

export function discoveryOptionsResponse(): Response {
	return new Response(null, { headers: DISCOVERY_CORS_HEADERS, status: 204 });
}

export function oauthDisabledResponse(): Response {
	return discoveryJsonResponse(
		{
			error: "not_found",
			error_description: "OAuth is not enabled on this deployment",
		},
		404,
	);
}

export function unauthorizedResponse(ctx: OAuthContext, options?: { oauth?: boolean }): Response {
	const offerOAuth = options?.oauth !== false && ctx.issuer !== null;
	const wwwAuthenticate = offerOAuth
		? `Bearer scope="${OAUTH_SCOPE_PARAM}", resource_metadata="${ctx.prmUrl}"`
		: "Bearer";

	return new Response(
		JSON.stringify({
			error: "unauthorized",
			error_description: "Authorization required",
		}),
		{
			headers: {
				"Content-Type": "application/json",
				"WWW-Authenticate": wwwAuthenticate,
				...MCP_CORS_HEADERS,
			},
			status: 401,
		},
	);
}

export function serviceUnavailableResponse(): Response {
	return new Response(
		JSON.stringify({
			error: "service_unavailable",
			error_description:
				"Unable to verify credentials — Novu API is unreachable. Please retry shortly.",
		}),
		{
			headers: { "Content-Type": "application/json", ...MCP_CORS_HEADERS },
			status: 503,
		},
	);
}

export { DISCOVERY_CORS_HEADERS, MCP_CORS_HEADERS } from "./context";

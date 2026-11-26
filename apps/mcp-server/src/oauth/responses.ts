import { DISCOVERY_CORS_HEADERS, MCP_CORS_HEADERS } from "./context";

export function oauthDisabledResponse(): Response {
	return new Response(
		JSON.stringify({
			error: "not_found",
			error_description: "OAuth is not enabled on this deployment",
		}),
		{
			headers: { "Content-Type": "application/json", ...DISCOVERY_CORS_HEADERS },
			status: 404,
		},
	);
}

/**
 * 401 for a missing or rejected API key. It carries no OAuth metadata, so a
 * client that presented an API key never starts the OAuth flow.
 */
export function apiKeyUnauthorizedResponse(): Response {
	return new Response(
		JSON.stringify({
			error: "unauthorized",
			error_description: "Authorization required",
		}),
		{
			headers: {
				"Content-Type": "application/json",
				"WWW-Authenticate": "Bearer",
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

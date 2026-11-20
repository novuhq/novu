import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isOAuthToken, NovuApiUtils } from "../utils/api";
import type { ToolAccessors } from "../utils/tool-accessors";

/**
 * Trim the /v1/users/me payload to identity basics — the tool must not dump
 * the full user object (it can carry profile/internal fields) to the client.
 */
function summarizeUser(payload: unknown): Record<string, unknown> {
	const user = (
		payload && typeof payload === "object" && "data" in payload
			? (payload as { data: unknown }).data
			: payload
	) as Record<string, unknown> | null;

	if (!user || typeof user !== "object") {
		return {};
	}

	const summary: Record<string, unknown> = {};
	for (const field of ["_id", "firstName", "lastName", "email"]) {
		if (user[field] !== undefined) {
			summary[field] = user[field];
		}
	}
	return summary;
}

export function registerAuthTools(
	server: McpServer,
	{ getToken, getApiUrl }: ToolAccessors,
	getRegion: () => string,
) {
	// Identity + auth diagnostics: verifies the credential against the live
	// Novu API (GET /v1/users/me) so the client learns who is authenticated and
	// whether the OAuth token or API key actually works.
	server.tool(
		"whoami",
		"Show who is currently authenticated (name, email) by verifying the credential (OAuth token or legacy API key) against the Novu API, and report the active server region",
		{},
		async () => {
			const token = getToken();
			const apiUrl = getApiUrl();
			const region = getRegion();
			const serverInfo = `Server: ${region.toUpperCase()} (${apiUrl})`;

			if (!token) {
				const message = `Not authenticated. Connect via OAuth (your MCP client will open the Novu sign-in page), or provide a legacy Novu API key in the Authorization header:\nAuthorization: Bearer your-key\n${serverInfo}`;
				console.log("Auth Status Check:", message);
				return { content: [{ text: message, type: "text" as const }] };
			}

			const authMode = isOAuthToken(token) ? "OAuth 2.0" : "Legacy API key";

			try {
				const response = await NovuApiUtils.fetchCurrentUser(token, apiUrl);

				if (response.ok) {
					const data = await response.json();
					const identity = JSON.stringify(summarizeUser(data), null, 2);
					const message = `Authenticated via ${authMode} — credential is valid and working.\n${serverInfo}\n\nUser:\n${identity}`;
					console.log("Auth Status Check: valid");
					return { content: [{ text: message, type: "text" as const }] };
				}

				if (response.status === 401) {
					const message = `Authenticated via ${authMode}, but the credential was REJECTED (401 Unauthorized) by the Novu API.\nIt may be invalid, expired, or revoked — please re-authenticate.\n${serverInfo}`;
					console.log("Auth Status Check: rejected (401)");
					return { content: [{ text: message, type: "text" as const }] };
				}

				const errorText = await response.text();
				const message = `Authenticated via ${authMode}, but the credential check returned status ${response.status}.\n${serverInfo}\nMessage: ${errorText}`;
				console.log(`Auth Status Check: status ${response.status}`);
				return { content: [{ text: message, type: "text" as const }] };
			} catch (error) {
				const message = `Authenticated via ${authMode}, but the credential check request failed: ${error instanceof Error ? error.message : "Unknown error"}\n${serverInfo}`;
				console.error("Auth Status Check error:", error);
				return { content: [{ text: message, type: "text" as const }] };
			}
		},
	);
}

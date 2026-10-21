import { isOAuthToken, NovuApiUtils } from "../utils/api";
import type { OAuthContext } from "./context";
import { serviceUnavailableResponse, unauthorizedResponse } from "./responses";

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
 * Validate the caller's credential against the live Novu API at initialize
 * time so a bad credential fails fast. Applies to both OAuth tokens and API
 * keys; a rejected credential yields a 401 whose OAuth-ness matches the token
 * (API keys never get the OAuth discovery challenge).
 */
export async function gateInitializeWithOAuthProbe(
	request: Request,
	token: string,
	apiUrl: string,
	ctx: OAuthContext,
): Promise<{ reject: Response } | { forwardBody: string | null }> {
	if (request.method !== "POST") {
		return { forwardBody: null };
	}

	const bodyText = await request.text();

	if (isInitializeRequest(bodyText)) {
		try {
			const response = await NovuApiUtils.fetchCurrentUser(token, apiUrl);
			if (!response.ok) {
				return { reject: unauthorizedResponse(ctx, { oauth: isOAuthToken(token) }) };
			}
		} catch {
			return { reject: serviceUnavailableResponse() };
		}
	}

	return { forwardBody: bodyText };
}

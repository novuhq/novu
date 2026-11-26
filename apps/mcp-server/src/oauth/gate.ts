import { NovuApiUtils } from "../utils/api";
import { apiKeyUnauthorizedResponse, serviceUnavailableResponse } from "./responses";

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
 * Validate an API key against the live Novu API at initialize time so a bad
 * key fails fast. OAuth tokens skip this: Clerk already verified them, audience
 * included, before the request got here.
 */
export async function gateInitializeWithApiKeyProbe(
	request: Request,
	token: string,
	apiUrl: string,
): Promise<{ reject: Response } | { forwardBody: string | null }> {
	if (request.method !== "POST") {
		return { forwardBody: null };
	}

	const bodyText = await request.text();

	if (isInitializeRequest(bodyText)) {
		try {
			const response = await NovuApiUtils.fetchCurrentUser(token, apiUrl);
			if (response.status === 401 || response.status === 403) {
				return { reject: apiKeyUnauthorizedResponse() };
			}
			if (!response.ok) return { reject: serviceUnavailableResponse() };
		} catch {
			return { reject: serviceUnavailableResponse() };
		}
	}

	return { forwardBody: bodyText };
}

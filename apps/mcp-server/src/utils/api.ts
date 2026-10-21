/**
 * Clerk OAuth access tokens are opaque and prefixed with `oat_`. This is the
 * single place that invariant lives — scheme selection, probe gating, and
 * display labels are all derived from it.
 */
export function isOAuthToken(token: string): boolean {
	return token.startsWith("oat_");
}

export class NovuApiUtils {
	/**
	 * Prepare headers for Novu API requests.
	 *
	 * OAuth access tokens are relayed verbatim as a Bearer token so the Novu API
	 * can validate them with Clerk and resolve org/permissions. Any other token
	 * is treated as a legacy Novu API key and sent with the `ApiKey` scheme.
	 *
	 * `environmentId` is forwarded as the `Novu-Environment-Id` header, and only
	 * for OAuth tokens: OAuth sessions are org-bound and default to the
	 * Development environment, so the header is how they target a specific one
	 * (the API validates the id belongs to the token's organization). API keys
	 * are already environment-bound, so the header is never sent for them.
	 */
	static prepareHeaders(
		token: string,
		options?: { idempotencyKey?: string; environmentId?: string },
	): Record<string, string> {
		const oauth = isOAuthToken(token);
		const headers: Record<string, string> = {
			Authorization: `${oauth ? "Bearer" : "ApiKey"} ${token}`,
			"Content-Type": "application/json",
		};

		if (options?.idempotencyKey) {
			headers["idempotency-key"] = options.idempotencyKey;
		}

		if (options?.environmentId && oauth) {
			headers["Novu-Environment-Id"] = options.environmentId;
		}

		return headers;
	}

	/**
	 * Fetch the authenticated user from the Novu API. Shared by the whoami tool
	 * and the initialize-time credential probe.
	 */
	static fetchCurrentUser(token: string, apiUrl: string): Promise<Response> {
		return fetch(`${apiUrl}/v1/users/me`, {
			headers: NovuApiUtils.prepareHeaders(token),
			method: "GET",
		});
	}

	/**
	 * Build query parameters from an object
	 */
	static buildQueryParams(params: Record<string, any>): URLSearchParams {
		const queryParams = new URLSearchParams();

		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined && value !== null) {
				if (Array.isArray(value)) {
					// Handle array parameters - add each item as separate parameter
					value.forEach((item) => queryParams.append(key, item.toString()));
				} else {
					queryParams.append(key, value.toString());
				}
			}
		}

		return queryParams;
	}

	/**
	 * Handle API response and return formatted result
	 */
	static async handleApiResponse(response: Response, operation: string, identifier?: string) {
		if (!response.ok) {
			const errorText = await response.text();
			console.error("Novu API Error:", response.status, errorText);

			const errorMessage = identifier
				? `Error: Failed to ${operation} ${identifier}. Status: ${response.status}, Message: ${errorText}`
				: `Error: Failed to ${operation}. Status: ${response.status}, Message: ${errorText}`;

			return {
				content: [
					{
						text: errorMessage,
						type: "text" as const,
					},
				],
			};
		}

		const data = await response.json();
		const successMessage = identifier
			? `Successfully ${operation} ${identifier}`
			: `Successfully ${operation}`;

		console.log(successMessage);

		return {
			content: [
				{
					text: `${successMessage}:\n\n${JSON.stringify(data, null, 2)}`,
					type: "text" as const,
				},
			],
		};
	}
}

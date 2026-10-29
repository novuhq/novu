import type { ApiResponse } from "../types";

export class ValidationUtils {
	/**
	 * Validate that a credential (OAuth token or legacy API key) is present.
	 */
	static validateToken(token: string | null): ApiResponse | null {
		if (!token) {
			return {
				content: [
					{
						text: "Error: Not authenticated. Connect via OAuth (your MCP client will open the Novu sign-in page), or provide a legacy Novu API key in the Authorization header:\nAuthorization: Bearer your-key",
						type: "text" as const,
					},
				],
			};
		}
		return null;
	}

	/**
	 * Validate that at least one query parameter is provided
	 */
	static validateAtLeastOneParam(
		params: Record<string, any>,
		paramNames: string[],
	): ApiResponse | null {
		const hasAnyParam = paramNames.some(
			(name) => params[name] !== undefined && params[name] !== null,
		);

		if (!hasAnyParam) {
			const paramList = paramNames.join(", ");
			return {
				content: [
					{
						text: `Error: At least one query parameter is required (${paramList}).`,
						type: "text" as const,
					},
				],
			};
		}
		return null;
	}

	/**
	 * Validate pagination parameters
	 */
	static validatePagination(page?: number, limit?: number): ApiResponse | null {
		if (page !== undefined && page < 0) {
			return {
				content: [
					{
						text: "Error: Page number must be 0 or greater.",
						type: "text" as const,
					},
				],
			};
		}

		if (limit !== undefined && (limit < 1 || limit > 50)) {
			return {
				content: [
					{
						text: "Error: Limit must be between 1 and 50.",
						type: "text" as const,
					},
				],
			};
		}

		return null;
	}
}

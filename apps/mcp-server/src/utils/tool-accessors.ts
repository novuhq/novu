/** Shared getters passed into every tool registration module. */
export type ToolAccessors = {
	getToken: () => string | null;
	getApiUrl: () => string;
	/**
	 * Optional. Returns the full `Authorization` header value, scheme included
	 * (e.g. `Internal <jwt>`). Called before every API request, so callers can
	 * mint short-lived credentials. When set, it replaces the token-based
	 * `Bearer oat_…` / `ApiKey …` header, and `getToken` may return null.
	 */
	getAuthorization?: () => string | Promise<string>;
};

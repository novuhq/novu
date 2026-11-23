// Clerk DCR grants exactly the scopes registered — the authorize request
// must not ask for scopes outside that set or Clerk returns invalid_scope.
// user:org:read first so clients that truncate scope lists still pick it up.
export const OAUTH_SCOPES = ["user:org:read", "email", "profile", "offline_access"] as const;

export const OAUTH_SCOPE_PARAM = OAUTH_SCOPES.join(" ");

export function mergeOAuthScopes(scope: unknown): string {
	const scopes = new Set(typeof scope === "string" ? scope.split(/\s+/).filter(Boolean) : []);
	for (const value of OAUTH_SCOPES) {
		scopes.add(value);
	}
	return [...scopes].join(" ");
}

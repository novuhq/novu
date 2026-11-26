// Scopes the 401 challenge asks for, and the protected resource metadata
// lists. user:org:read first so clients that truncate scope lists still pick
// it up: it makes the consent screen ask which organization to act for.
export const OAUTH_SCOPES = ["user:org:read", "email", "profile", "offline_access"] as const;

/** What the Worker is configured with. See `wrangler.jsonc` and the README. */
export type Env = {
  /** The Agent Inbox Clerk app, which signs people in: `https://clerk.agentinbox.md`. Empty turns sign-in off. */
  CLERK_OAUTH_ISSUER?: string;
  /** The secret the Agent Inbox dashboard shares with the Novu API. It lets this server act for an account. */
  AGENT_INBOX_DASHBOARD_API_SECRET?: string;
  /** The Agent Inbox Dashboard API, which every tool calls as the account: `https://www.agentinbox.md/api`. */
  AGENT_INBOX_API_URL?: string;
  /**
   * The Novu API (US; Agent Inbox has no EU region). Only asked for the account's key with the dashboard secret,
   * the one call the Dashboard API doesn't offer.
   */
  NOVU_API_URL?: string;
  /** Where a person who opens the server's address in a browser is sent. */
  DOCS_URL?: string;
  /** Remembers which AI tools signed in, and for a few minutes who a token belongs to. Optional. */
  CONNECTIONS?: KVNamespace;
};

/** A configured address without the slash at its end, or `null` when it is empty. */
export function urlOf(value: string | undefined): string | null {
  return value?.trim().replace(/\/$/, '') || null;
}

export function issuerOf(env: Env): string | null {
  return urlOf(env.CLERK_OAUTH_ISSUER);
}

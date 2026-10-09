/** What the Worker is configured with. See `wrangler.jsonc` and the README. */
export type Env = {
  /** The Human Clerk app, which signs people in: `https://clerk.gethuman.md`. Empty turns sign-in off. */
  CLERK_OAUTH_ISSUER?: string;
  /** The secret the Human dashboard shares with the Novu API. It lets this server act for an account. */
  HUMAN_DASHBOARD_API_SECRET?: string;
  /** The Novu API of the US region, and of the EU region when there is one. */
  NOVU_API_URL?: string;
  NOVU_API_URL_EU?: string;
  /** Where a person who opens the server's address in a browser is sent. */
  DOCS_URL?: string;
  /** Remembers which AI tools signed in, and for a few minutes who a token belongs to. Optional. */
  CONNECTIONS?: KVNamespace;
};

export type Region = 'us' | 'eu';

/** The API of each region that is configured, US first: most accounts live there. */
export function apiUrls(env: Env): Array<{ region: Region; url: string }> {
  const urls: Array<{ region: Region; url: string | undefined }> = [
    { region: 'us', url: env.NOVU_API_URL },
    { region: 'eu', url: env.NOVU_API_URL_EU },
  ];

  return urls.flatMap(({ region, url }) => (url?.trim() ? [{ region, url: url.trim().replace(/\/$/, '') }] : []));
}

export function issuerOf(env: Env): string | null {
  return env.CLERK_OAUTH_ISSUER?.trim().replace(/\/$/, '') || null;
}

import { DASHBOARD_HOME } from '@/components/dashboard/nav';

/** The query parameter that carries the page to return to. Clerk's route protection uses the same name. */
export const REDIRECT_PARAM = 'redirect_url';

/** Set on the way back to the form when signing in with GitHub or Google did not work out. */
export const SSO_ERROR_PARAM = 'sso_error';

export type AuthPage = '/sign-in' | '/sign-up';

const MCP_CONNECT_PATH = '/mcp/connect';

/**
 * The query parameter of `/mcp/connect` that carries Clerk's page to go back to, in base64url. As a plain
 * URL it got broken on the way: right after sign-in, Clerk's session handshake rebuilds the address, and
 * the inner address's own `&client_id=…` spilled out of it. Base64url has no character to spill.
 */
export const MCP_CONNECT_PARAM = 'to';

/**
 * Where to go after signing in or up: the page that sent the visitor here, as a path on this site. The
 * value comes from the URL, so anything that points at another site (or back at the forms) is replaced
 * with the dashboard. Route protection sends a full URL, the pages send a path.
 *
 * Clerk's pages that let an AI tool in are the one other site allowed: an AI tool connecting to the Agent
 * Inbox MCP server sent the visitor. They go by `/mcp/connect`, which makes sure the account exists and
 * sends them back to Clerk. It leads only to this app's own consent screen, which anyone could link to anyway.
 */
export function safeRedirectPath(value: string | string[] | undefined | null, host: string | null): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return DASHBOARD_HOME;
  }

  const clerkAuthorize = clerkAuthorizeUrl(raw);
  if (clerkAuthorize) {
    return mcpConnectPath(clerkAuthorize);
  }

  if (!host) {
    return DASHBOARD_HOME;
  }

  let url: URL;
  try {
    // The scheme of the base does not matter: only the host is compared and only the path is kept.
    url = new URL(raw, `http://${host}`);
  } catch {
    return DASHBOARD_HOME;
  }

  const isThisSite = url.host === host && (url.protocol === 'http:' || url.protocol === 'https:');
  // A path can itself start with `//` (`https://this-site//other.example`), and a browser reads that
  // as the address of another site.
  const leavesSite = url.pathname.startsWith('//');
  if (!isThisSite || leavesSite || isAuthPath(url.pathname)) {
    return DASHBOARD_HOME;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

/** The page that takes a signed-in person back to Clerk, to finish connecting an AI tool. */
export function mcpConnectPath(authorizeUrl: string): string {
  return `${MCP_CONNECT_PATH}?${new URLSearchParams({ [MCP_CONNECT_PARAM]: toBase64Url(authorizeUrl) })}`;
}

/** Clerk's page in a `/mcp/connect` link (`MCP_CONNECT_PARAM`), or null when it isn't one that lets an AI tool in. */
export function mcpConnectTarget(value: string | string[] | undefined | null): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return null;
  }

  try {
    return clerkAuthorizeUrl(fromBase64Url(raw));
  } catch {
    return null;
  }
}

/** A URL is ASCII once parsed (`URL.href`), so `btoa` takes it as it is. */
function toBase64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  return atob(value.replace(/-/g, '+').replace(/_/g, '/'));
}

/**
 * The address of one of Clerk's pages that let an AI tool in, when the value is exactly such a page of this
 * app's Clerk, or null. Clerk sends a person to sign in from each, and the tool connects once they are back.
 */
export function clerkAuthorizeUrl(value: string | string[] | undefined | null): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  return clerkAuthorizePages().includes(`${url.origin}${url.pathname}`) ? url.href : null;
}

/**
 * Clerk's pages of an AI tool's sign-in. On Clerk's own address: the authorize page a tool opens, and the
 * one Clerk comes back to after sign-in. On its hosted pages (the Account Portal), the consent screen where
 * the person approves the tool. Empty without the publishable key.
 */
function clerkAuthorizePages(): string[] {
  const host = clerkHost();
  if (!host) {
    return [];
  }

  try {
    const clerk = new URL(`https://${host}`).origin;
    // Clerk's own rule (`buildAccountsBaseUrl`): `clerk.agentinbox.md` hosts its pages on `accounts.agentinbox.md`.
    const accountPortal = new URL(`https://${host.replace(/clerk\.accounts\.|clerk\./, 'accounts.')}`).origin;

    return [
      `${clerk}/oauth/authorize`,
      `${clerk}/oauth/authorize-with-immediate-redirect`,
      `${accountPortal}/oauth-consent`,
    ];
  } catch {
    return [];
  }
}

/**
 * The host of this app's Clerk. The publishable key carries it: `pk_test_` or `pk_live_`, then the host with
 * a `$` after it, in base64.
 */
function clerkHost(): string | null {
  const encoded = /^pk_(?:test|live)_(.+)$/.exec(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '')?.[1];
  if (!encoded) {
    return null;
  }

  try {
    const host = atob(encoded);

    return host.endsWith('$') && host.length > 1 ? host.slice(0, -1) : null;
  } catch {
    return null;
  }
}

function isAuthPath(pathname: string): boolean {
  return ['/sign-in', '/sign-up'].some((page) => pathname === page || pathname.startsWith(`${page}/`));
}

/** A link to one of the forms that keeps the page to return to. */
export function authHref(page: AuthPage, redirectPath: string): string {
  return withRedirect(page, redirectPath);
}

/** Where GitHub and Google send the visitor back to, on the same side (sign-in or sign-up) they started from. */
export function ssoCallbackHref(page: AuthPage, redirectPath: string): string {
  return withRedirect(`${page}/sso-callback`, redirectPath);
}

function withRedirect(path: string, redirectPath: string): string {
  if (redirectPath === DASHBOARD_HOME) {
    return path;
  }

  return `${path}?${new URLSearchParams({ [REDIRECT_PARAM]: redirectPath })}`;
}

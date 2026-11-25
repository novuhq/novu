import { isJwtExpired } from '../utils/jwt';

export type HttpClientOptions = {
  apiVersion?: string;
  apiUrl?: string;
  headers?: Record<string, string>;
};

/**
 * Gets a new session token. Resolves to `true` when the client now holds a token newer than `staleToken`
 * for the same subscriber and context, so a request sent with `staleToken` can be retried.
 */
export type SessionRefresher = (staleToken?: string) => Promise<boolean>;

export type HttpRequestOptions = RequestInit & {
  /**
   * Do not refresh the session and retry when the request answers 401.
   * Set for the session request itself, which would otherwise wait on its own refresh.
   */
  skipSessionRefresh?: boolean;
};

export const DEFAULT_API_VERSION = 'v1';
const DEFAULT_CLIENT_VERSION = `${PACKAGE_NAME}@${PACKAGE_VERSION}`;

export class HttpClient {
  // Environment variable for local development that overrides the default API endpoint without affecting the Inbox DX
  private DEFAULT_BACKEND_URL =
    (typeof window !== 'undefined' &&
      (window as Window & { NOVU_LOCAL_BACKEND_URL?: string }).NOVU_LOCAL_BACKEND_URL) ||
    'https://api.novu.co';

  private apiUrl: string;
  private apiVersion: string;
  private headers: Record<string, string>;
  private sessionRefresher?: SessionRefresher;

  constructor(options: HttpClientOptions = {}) {
    const { apiVersion = DEFAULT_API_VERSION, apiUrl = this.DEFAULT_BACKEND_URL, headers = {} } = options || {};
    this.apiVersion = apiVersion;
    this.apiUrl = `${apiUrl}/${apiVersion}`;
    this.headers = {
      'Novu-API-Version': NOVU_API_VERSION,
      'Novu-Client-Version': DEFAULT_CLIENT_VERSION,
      'Content-Type': 'application/json',
      ...headers,
    };
  }

  setAuthorizationToken(token: string) {
    this.headers.Authorization = `Bearer ${token}`;
  }

  /**
   * Called when a request fails with 401 because its subscriber token expired.
   * The request is retried once after the refresh succeeds.
   */
  setSessionRefresher(refresher: SessionRefresher) {
    this.sessionRefresher = refresher;
  }

  setKeylessHeader(identifier?: string) {
    const keylessAppIdentifier =
      identifier ||
      (typeof window !== 'undefined' && window.localStorage?.getItem('novu_keyless_application_identifier'));

    if (!keylessAppIdentifier || !keylessAppIdentifier.startsWith('pk_keyless_')) {
      return;
    }

    this.headers['Novu-Application-Identifier'] = keylessAppIdentifier;
  }

  setHeaders(headers: Record<string, string>) {
    this.headers = {
      ...this.headers,
      ...headers,
    };
  }

  async get<T>(path: string, searchParams?: URLSearchParams, unwrapEnvelope = true) {
    return this.doFetch<T>({
      path,
      searchParams,
      options: {
        method: 'GET',
      },
      unwrapEnvelope,
    });
  }

  async post<T>(path: string, body?: unknown, options?: HttpRequestOptions) {
    return this.doFetch<T>({
      path,
      options: {
        method: 'POST',
        body,
        headers: options?.headers,
      },
      allowSessionRefresh: !options?.skipSessionRefresh,
    });
  }

  async patch<T>(path: string, body?: unknown) {
    return this.doFetch<T>({
      path,
      options: {
        method: 'PATCH',
        body,
      },
    });
  }

  async delete<T>(path: string, body?: unknown) {
    return this.doFetch<T>({
      path,
      options: {
        method: 'DELETE',
        body,
      },
    });
  }

  private async doFetch<T>({
    path,
    searchParams,
    options,
    unwrapEnvelope = true,
    allowSessionRefresh = true,
  }: {
    path: string;
    searchParams?: URLSearchParams;
    options?: Omit<RequestInit, 'body'> & { body?: unknown };
    unwrapEnvelope?: boolean;
    allowSessionRefresh?: boolean;
  }): Promise<T> {
    const fullUrl = combineUrl(this.apiUrl, path, searchParams ? `?${searchParams.toString()}` : '');
    const headers: Record<string, string> = {
      ...this.headers,
      ...((options?.headers as Record<string, string>) || {}),
    };
    const reqInit = {
      method: options?.method || 'GET',
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    };

    const response = await fetch(fullUrl, reqInit);

    if (response.status === 401 && allowSessionRefresh && (await this.refreshSessionAfter401(headers.Authorization))) {
      return this.doFetch<T>({ path, searchParams, options, unwrapEnvelope, allowSessionRefresh: false });
    }

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(
        `${this.headers['Novu-Client-Version']} error. Status: ${response.status}, Message: ${errorData.message}`
      ) as Error & { status?: number; body?: unknown };
      error.status = response.status;
      error.body = errorData;
      throw error;
    }
    if (response.status === 204) {
      return undefined as T;
    }

    const res = await response.json();

    return (unwrapEnvelope ? res.data : res) as T;
  }

  /**
   * Decides whether a request that answered 401 should be sent again.
   * Only an expired subscriber token is refreshed; other 401s are returned to the caller as before.
   */
  private async refreshSessionAfter401(sentAuthorization: string | undefined): Promise<boolean> {
    if (!sentAuthorization || !this.sessionRefresher) {
      return false;
    }

    const sentToken = sentAuthorization.replace(/^Bearer /, '');
    if (!isJwtExpired(sentToken)) {
      return false;
    }

    /*
     * The session decides whether a retry is safe: it renews only a token of the current subscriber and context.
     * After `changeSubscriber` or `changeContext` the request belongs to the previous one and must not be resent
     * with the new token, which would apply it to the new subscriber.
     */
    try {
      return await this.sessionRefresher(sentToken);
    } catch {
      return false;
    }
  }
}

function combineUrl(...args: string[]): string {
  return (
    args
      .reduce<string[]>((acc, part) => {
        if (part) {
          /*
           * 1. Replace multiple slashes with a single slash unless they are part of a protocol (http:, https:)
           * 2. Remove leading and trailing slashes
           */
          acc.push(part.replace(/(?<!https?:)\/+/g, '/').replace(/^\/+|\/+$/g, ''));
        }

        return acc;
      }, [])
      .join('/')
      // For search params, replace /foo/?bar=42 with /foo?bar=42
      .replace(/\/\?/, '?')
  );
}

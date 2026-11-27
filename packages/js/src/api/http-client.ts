import { NovuError } from '../utils/errors';

export type HttpClientOptions = {
  apiVersion?: string;
  apiUrl?: string;
  headers?: Record<string, string>;
};

/**
 * Gets a new session token. Resolves to a token newer than `staleToken` for the same subscriber and context, to send
 * the request again with, or `undefined` when there is none.
 */
export type SessionRefresher = (staleToken?: string) => Promise<string | undefined>;

/** The session's say over each request; it owns when a token is renewed and whether a request may be resent. */
export type SessionGuard = {
  /** Resolves to the token to send a request with; rejects when the request must not go out at all. */
  tokenForRequest: (currentToken: string | undefined) => Promise<string | undefined>;
  refresh: SessionRefresher;
  /**
   * False when `token` belongs to a subscriber or context that has been replaced since it was issued. A response
   * to a request sent with it is the previous subscriber's data and must not reach caches or listeners.
   */
  isCurrentToken: (token: string) => boolean;
};

export type HttpRequestOptions = RequestInit & {
  /**
   * Do not refresh the session before sending, nor retry when the request answers 401.
   * Set for the session request itself, which would otherwise wait on its own refresh.
   */
  skipSessionRefresh?: boolean;
};

export class HttpError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

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
  private session?: SessionGuard;

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

  setSession(session: SessionGuard) {
    this.session = session;
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
    retryToken,
  }: {
    path: string;
    searchParams?: URLSearchParams;
    options?: Omit<RequestInit, 'body'> & { body?: unknown };
    unwrapEnvelope?: boolean;
    allowSessionRefresh?: boolean;
    /** Set on the one retry after a 401: the token the refresh produced, sent as is. */
    retryToken?: string;
  }): Promise<T> {
    const fullUrl = combineUrl(this.apiUrl, path, searchParams ? `?${searchParams.toString()}` : '');
    const isRetry = retryToken !== undefined;
    const currentToken = this.headers.Authorization?.replace(/^Bearer /, '');
    const token =
      allowSessionRefresh && !isRetry && this.session
        ? await this.session.tokenForRequest(currentToken)
        : (retryToken ?? currentToken);
    const headers: Record<string, string> = {
      ...this.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options?.headers as Record<string, string>) || {}),
    };
    const reqInit = {
      method: options?.method || 'GET',
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    };

    const response = await fetch(fullUrl, reqInit);

    if (response.status === 401 && allowSessionRefresh && !isRetry) {
      const renewedToken = await this.refreshSessionAfter401(headers.Authorization);
      if (renewedToken) {
        return this.doFetch<T>({ path, searchParams, options, unwrapEnvelope, retryToken: renewedToken });
      }
    }

    // The subscriber or context can change until the body has been read; a response for the replaced one is dropped
    const dropIfReplaced = () => {
      if (allowSessionRefresh && token && this.session && !this.session.isCurrentToken(token)) {
        throw new NovuError(
          'The subscriber or context changed while the request was running, so its response was dropped',
          undefined
        );
      }
    };

    if (!response.ok) {
      const errorData = await response.json();
      dropIfReplaced();
      throw new HttpError(
        `${this.headers['Novu-Client-Version']} error. Status: ${response.status}, Message: ${errorData.message}`,
        response.status,
        errorData
      );
    }
    if (response.status === 204) {
      dropIfReplaced();

      return undefined as T;
    }

    const res = await response.json();
    dropIfReplaced();

    return (unwrapEnvelope ? res.data : res) as T;
  }

  /**
   * Called when a request fails with 401, for example because its token expired.
   * The request is retried once after the refresh succeeds.
   */
  private async refreshSessionAfter401(sentAuthorization: string | undefined): Promise<string | undefined> {
    if (!sentAuthorization || !this.session) {
      return undefined;
    }

    /*
     * The session decides whether a retry is safe: it renews only a token of the current subscriber and context.
     * After `changeSubscriber` or `changeContext` the request belongs to the previous one and must not be resent
     * with the new token, which would apply it to the new subscriber.
     */
    const sentToken = sentAuthorization.replace(/^Bearer /, '');
    try {
      return await this.session.refresh(sentToken);
    } catch {
      return undefined;
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

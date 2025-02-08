export type HttpClientOptions = {
  apiVersion?: string;
  apiUrl?: string;
  userAgent?: string;
};

const DEFAULT_API_VERSION = 'v1';
const DEFAULT_BACKEND_URL = 'https://api.novu.co';
const DEFAULT_USER_AGENT = `${PACKAGE_NAME}@${PACKAGE_VERSION}`;

export class HttpClient {
  private apiUrl: string;
  private apiVersion: string;
  private headers: Record<string, string>;

  constructor(options: HttpClientOptions = {}) {
    const {
      apiVersion = DEFAULT_API_VERSION,
      apiUrl = DEFAULT_BACKEND_URL,
      userAgent = DEFAULT_USER_AGENT,
    } = options || {};
    this.apiVersion = apiVersion;
    this.apiUrl = `${apiUrl}/${this.apiVersion}`;
    this.headers = {
      'Novu-API-Version': NOVU_API_VERSION,
      'Content-Type': 'application/json',
      'User-Agent': userAgent,
    };
  }

  setAuthorizationToken(token: string) {
    this.headers.Authorization = `Bearer ${token}`;
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

  async post<T>(path: string, body?: any) {
    return this.doFetch<T>({
      path,
      options: {
        method: 'POST',
        body,
      },
    });
  }

  async patch<T>(path: string, body?: any) {
    return this.doFetch<T>({
      path,
      options: {
        method: 'PATCH',
        body,
      },
    });
  }

  async delete<T>(path: string, body?: any) {
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
  }: {
    path: string;
    searchParams?: URLSearchParams;
    options?: RequestInit;
    unwrapEnvelope?: boolean;
  }) {
    const fullUrl = combineUrl(this.apiUrl, path, searchParams ? `?${searchParams.toString()}` : '');
    const reqInit = {
      method: options?.method || 'GET',
      headers: { ...this.headers, ...(options?.headers || {}) },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    };

    const response = await fetch(fullUrl, reqInit);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`${this.headers['User-Agent']} error. Status: ${response.status}, Message: ${errorData.message}`);
    }
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const res = await response.json();

    return (unwrapEnvelope ? res.data : res) as Promise<T>;
  }
}

function combineUrl(...args: string[]): string {
  return args.map((part) => part.replace(/^\/+|\/+$/g, '')).join('/');
}

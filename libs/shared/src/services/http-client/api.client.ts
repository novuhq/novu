//SubscriberCustomData
export interface IParamObject {
  [key: string]: string | string[] | number | boolean;
}

export interface IPaginatedResponse<T = unknown> {
  data: T[];
  hasMore: boolean;
  totalCount: number;
  pageSize: number;
  page: number;
}

export class HttpClient {
  private backendUrl: string;
  private apiVersion = 'v1';

  constructor(backendUrl: string) {
    this.backendUrl = `${backendUrl}/${this.apiVersion}`;
  }

  private headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  setAuthorizationToken(token: string) {
    this.headers.Authorization = `Bearer ${token}`;
  }

  disposeAuthorizationToken() {
    delete this.headers.Authorization;
  }

  async getFullResponse(url: string, params?: IParamObject) {
    const response = await fetch(this.backendUrl + url + this.getQueryString(params), {
      headers: this.headers,
    });

    return await response.json();
  }

  async get(url: string, params?: IParamObject) {
    const response = await fetch(this.backendUrl + url + this.getQueryString(params), {
      headers: this.headers,
    });
    const data = await response.json();

    return data.data;
  }

  async post(url: string, body = {}) {
    const response = await fetch(this.backendUrl + url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    const data = await response.json();

    return data.data;
  }

  async patch(url: string, body = {}) {
    const response = await fetch(this.backendUrl + url, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    const data = await response.json();

    return data.data;
  }

  async delete(url: string, body = {}) {
    const response = await fetch(this.backendUrl + url, {
      method: 'DELETE',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    const data = await response.json();

    return data.data;
  }

  private getQueryString(params?: IParamObject) {
    if (!params) return '';

    const queryString = Object.entries(params)
      .filter(([key, value]) => value !== undefined)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return value.map((val) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`).join('&');
        } else {
          return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        }
      })
      .join('&');

    return queryString ? `?${queryString}` : '';
  }
}

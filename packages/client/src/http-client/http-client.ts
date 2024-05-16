import { ApiOptions } from '..';
import { CustomDataType } from '@novu/shared';

export class HttpClient {
  private backendUrl: string;
  private apiVersion = 'v1';
  private headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  constructor(backendUrl: string, options?: ApiOptions) {
    if (options?.apiVersion) {
      this.apiVersion = options.apiVersion;
    }
    this.backendUrl = `${backendUrl}/${this.apiVersion}`;
  }

  setAuthorizationToken(token: string) {
    this.headers.Authorization = `Bearer ${token}`;
  }

  disposeAuthorizationToken() {
    delete this.headers.Authorization;
  }

  async getFullResponse(url: string, params?: CustomDataType) {
    const response = await fetch(
      this.backendUrl + url + this.getQueryString(params),
      {
        headers: this.headers,
      }
    );

    return await response.json();
  }

  async get(url: string, params?: CustomDataType) {
    const response = await fetch(
      this.backendUrl + url + this.getQueryString(params),
      {
        headers: this.headers,
      }
    );
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

  private getQueryString(params?: CustomDataType) {
    if (!params) return '';

    const queryString = new URLSearchParams(params as any);

    return '?' + queryString.toString();
  }
}

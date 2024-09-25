import type { CustomDataType } from '@novu/shared';
import { ApiOptions } from '..';

const DEFAULT_API_VERSION = 'v1';
const DEFAULT_BACKEND_URL = 'https://api.novu.co';
const PACKAGE_NAME = '@novu/client';
const PACKAGE_VERSION = '2.0.0-canary.0';
const DEFAULT_USER_AGENT = `${PACKAGE_NAME}-${PACKAGE_VERSION}`;

export class HttpClient {
  private backendUrl: string;
  private apiVersion: string;
  private headers: Record<string, string>;

  constructor({
    apiVersion = DEFAULT_API_VERSION,
    backendUrl = DEFAULT_BACKEND_URL,
    userAgent = DEFAULT_USER_AGENT,
  }: ApiOptions = {}) {
    this.apiVersion = apiVersion;
    this.backendUrl = `${backendUrl}/${this.apiVersion}`;
    this.headers = {
      'Content-Type': 'application/json',
      'User-Agent': userAgent,
    };
  }

  setAuthorizationToken(token: string) {
    this.headers.Authorization = `Bearer ${token}`;
  }

  disposeAuthorizationToken() {
    delete this.headers.Authorization;
  }

  updateHeaders(headers: Record<string, string>) {
    this.headers = {
      ...this.headers,
      ...headers,
    };
  }

  async getFullResponse(url: string, params?: CustomDataType) {
    const response = await this.doFetch(url + this.getQueryString(params));

    return await response.json();
  }

  async get(url: string, params?: CustomDataType) {
    const response = await this.doFetch(url + this.getQueryString(params));
    const data = await response.json();

    return data.data;
  }

  async post(url: string, body = {}) {
    const response = await this.doFetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const hasEmptyResponse = this.checkEmptyResponse(response);
    if (hasEmptyResponse) {
      return;
    }

    const data = await response.json();

    return data.data;
  }

  async patch(url: string, body = {}) {
    const response = await this.doFetch(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    const hasEmptyResponse = this.checkEmptyResponse(response);
    if (hasEmptyResponse) {
      return;
    }

    const data = await response.json();

    return data.data;
  }

  async delete(url: string, body = {}) {
    const response = await this.doFetch(url, {
      method: 'DELETE',
      body: JSON.stringify(body),
    });
    const hasEmptyResponse = this.checkEmptyResponse(response);
    if (hasEmptyResponse) {
      return;
    }

    const data = await response.json();

    return data.data;
  }

  private getQueryString(params?: CustomDataType) {
    if (!params) return '';

    const queryString = new URLSearchParams(params as any);

    return `?${queryString.toString()}`;
  }

  private async doFetch(url: string, options: RequestInit = {}) {
    const response = await fetch(this.backendUrl + url, {
      ...options,
      headers: this.headers,
    });
    await this.checkResponseStatus(response);

    return response;
  }

  private async checkResponseStatus(response: Response) {
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP error! Status: ${response.status}, Message: ${errorData.message}`,
      );
    }
  }

  private checkEmptyResponse(response: Response) {
    if (response.status === 204) {
      return true;
    }

    return false;
  }
}

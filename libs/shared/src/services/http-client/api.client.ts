import axios, { AxiosInstance } from 'axios';

export class HttpClient {
  private axiosClient: AxiosInstance;

  constructor(private backendUrl: string) {
    this.axiosClient = axios.create({
      baseURL: backendUrl + '/v1',
    });
  }

  setAuthorizationToken(token: string) {
    this.axiosClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  disposeAuthorizationToken() {
    delete this.axiosClient.defaults.headers.common.Authorization;
  }

  async get(url: string) {
    return await this.axiosClient.get(url).then((response) => response.data.data);
  }

  async getFullResponse(url: string, params?: { [key: string]: string | string[] | number }) {
    return await this.axiosClient
      .get(url, {
        params,
      })
      .then((response) => response.data.data);
  }

  async post(url: string, body = {}) {
    return await this.axiosClient.post(url, body).then((response) => response.data.data);
  }
}

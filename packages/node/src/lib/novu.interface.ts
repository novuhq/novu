import { AxiosInstance } from 'axios';

export interface INovuConfiguration {
  backendUrl?: string;
}

export class WithHttp {
  protected readonly http: AxiosInstance;

  constructor(http: AxiosInstance) {
    this.http = http;
  }
}

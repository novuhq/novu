import { AxiosInstance } from 'axios';

interface IRetryConfig {
  initialDelay: number;
  waitMin: number;
  waitMax: number;
  retryMax: number;
}

export interface INovuConfiguration {
  backendUrl?: string;
  retryConfig?: Partial<IRetryConfig>;
}

export class WithHttp {
  protected readonly http: AxiosInstance;

  constructor(http: AxiosInstance) {
    this.http = http;
  }
}

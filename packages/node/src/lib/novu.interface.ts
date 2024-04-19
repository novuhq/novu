import { AxiosError, AxiosInstance } from 'axios';

export interface IRetryConfig {
  initialDelay?: number;
  waitMin?: number;
  waitMax?: number;
  retryMax?: number;
  retryCondition?: (err: AxiosError) => boolean;
}

export interface INovuConfiguration {
  apiKey?: string;
  backendUrl?: string;
  retryConfig?: IRetryConfig;
}

export class WithHttp {
  protected readonly http: AxiosInstance;

  constructor(http: AxiosInstance) {
    this.http = http;
  }
}

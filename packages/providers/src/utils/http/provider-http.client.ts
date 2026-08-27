import axios, { AxiosInstance, CreateAxiosDefaults } from 'axios';
import { PROVIDER_HTTP_TIMEOUT_MS } from './provider-http.constants';

export interface ProviderHttpClientOptions extends CreateAxiosDefaults {
  /** Overrides {@link PROVIDER_HTTP_TIMEOUT_MS} for providers that need a different cap. */
  timeoutMs?: number;
}

/**
 * Creates the axios instance every provider should use for outbound calls.
 *
 * The only behavior it adds over `axios.create` is a mandatory request timeout.
 * It deliberately does not retry: a provider send is not idempotent, so a second
 * attempt risks delivering the same message twice.
 */
export const createProviderHttpClient = (options: ProviderHttpClientOptions = {}): AxiosInstance => {
  const { timeoutMs, ...axiosConfig } = options;

  return axios.create({
    ...axiosConfig,
    timeout: timeoutMs ?? axiosConfig.timeout ?? PROVIDER_HTTP_TIMEOUT_MS,
  });
};

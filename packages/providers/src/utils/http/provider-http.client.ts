import axios, { AxiosInstance, CreateAxiosDefaults, InternalAxiosRequestConfig } from 'axios';
import { isTimeoutError } from './is-timeout-error';
import { PROVIDER_HTTP_TIMEOUT_MS } from './provider-http.constants';
import { notifyProviderHttpCall } from './provider-http.observer';

export interface ProviderHttpClientOptions extends CreateAxiosDefaults {
  /** Provider id, used only to label observability events. */
  providerId?: string;
  /** Channel name, used only to label observability events. */
  channel?: string;
  /** Overrides {@link PROVIDER_HTTP_TIMEOUT_MS} for providers that need a different cap. */
  timeoutMs?: number;
}

const STARTED_AT = Symbol('novuProviderHttpStartedAt');

type TimedRequestConfig = InternalAxiosRequestConfig & { [STARTED_AT]?: number };

/**
 * Creates the axios instance every provider should use for outbound calls.
 *
 * The only behavior it adds over `axios.create` is a mandatory request timeout and
 * timing instrumentation. It deliberately does not retry: a provider send is not
 * idempotent, so a second attempt risks delivering the same message twice.
 */
export const createProviderHttpClient = (options: ProviderHttpClientOptions = {}): AxiosInstance => {
  const { providerId, channel, timeoutMs, ...axiosConfig } = options;

  const instance = axios.create({
    ...axiosConfig,
    timeout: timeoutMs ?? axiosConfig.timeout ?? PROVIDER_HTTP_TIMEOUT_MS,
  });

  instrument(instance, providerId, channel);

  return instance;
};

/**
 * Interceptors are skipped when they are absent, which is the case under the
 * `axiosSpy` test helper. Timings are observability only, so losing them in tests
 * costs nothing and keeps the helper from needing to model the full axios surface.
 */
const instrument = (instance: AxiosInstance, providerId?: string, channel?: string): void => {
  if (!instance.interceptors?.request || !instance.interceptors?.response) {
    return;
  }

  instance.interceptors.request.use((config: TimedRequestConfig) => {
    config[STARTED_AT] = Date.now();

    return config;
  });

  const emit = (config: TimedRequestConfig | undefined, timedOut: boolean) => {
    const startedAt = config?.[STARTED_AT];

    if (startedAt === undefined) {
      return;
    }

    notifyProviderHttpCall({
      providerId,
      channel,
      durationMs: Date.now() - startedAt,
      timedOut,
    });
  };

  instance.interceptors.response.use(
    (response) => {
      emit(response.config as TimedRequestConfig, false);

      return response;
    },
    (error) => {
      emit(error?.config as TimedRequestConfig | undefined, isTimeoutError(error));

      return Promise.reject(error);
    }
  );
};

import { AxiosInstance } from 'axios';
import axiosRetry, { isNetworkError, isRetryableError } from 'axios-retry';
import { v4 as uuid } from 'uuid';
import { INovuConfiguration } from './novu.interface';

const NON_IDEMPOTENT_METHODS = ['post', 'patch'];

export function makeRetriable(
  axios: AxiosInstance,
  config?: INovuConfiguration
) {
  axios.interceptors.request.use((axiosConfig) => {
    // don't attach idempotency key for idempotent methods
    if (
      axiosConfig.method &&
      !NON_IDEMPOTENT_METHODS.includes(axiosConfig.method)
    ) {
      return axiosConfig;
    }

    const idempotencyKey = axiosConfig.headers['Idempotency-Key'];
    // that means intercepted request is retried, so don't generate new idempotency key
    if (idempotencyKey) {
      return axiosConfig;
    }

    axiosConfig.headers['Idempotency-Key'] = uuid();

    return axiosConfig;
  });

  const retryConfig = config?.retryConfig || {};
  const retries = retryConfig.retryMax || 0;
  const minDelay = retryConfig.waitMin || 1;
  const maxDelay = retryConfig.waitMax || 30;
  const initialDelay = retryConfig.initialDelay || minDelay;

  function backoff(retryCount: number) {
    if (retryCount === 1) {
      return initialDelay;
    }

    const delay = retryCount * minDelay;
    if (delay > maxDelay) {
      return maxDelay;
    }

    return delay;
  }

  axiosRetry(axios, {
    retries,
    retryDelay(retryCount) {
      return backoff(retryCount) * 1000; // return delay in milliseconds
    },
    retryCondition(err) {
      return isNetworkError(err) || isRetryableError(err);
    },
  });
}

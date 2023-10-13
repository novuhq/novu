import { AxiosError, AxiosInstance } from 'axios';
import axiosRetry, { isNetworkError } from 'axios-retry';
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
  const retryCondition = retryConfig.retryCondition || defaultRetryCondition;

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
    retryCondition,
    retryDelay(retryCount) {
      return backoff(retryCount) * 1000; // return delay in milliseconds
    },
    onRetry(_retryCount, error, requestConfig) {
      if (
        error.response?.status === 422 &&
        requestConfig.headers &&
        requestConfig.method &&
        NON_IDEMPOTENT_METHODS.includes(requestConfig.method)
      ) {
        requestConfig.headers['Idempotency-Key'] = uuid();
      }
    },
  });
}

const RETRIABLE_HTTP_CODES = [408, 429, 422];

export function defaultRetryCondition(err: AxiosError): boolean {
  // retry on TCP/IP error codes like ECONNRESET
  if (isNetworkError(err)) {
    return true;
  }

  if (err.code === 'ECONNABORTED') {
    return false;
  }

  if (!err.response) {
    return true;
  }

  if (err.response.status >= 500 && err.response.status <= 599) {
    return true;
  }

  if (RETRIABLE_HTTP_CODES.includes(err.response.status)) {
    return true;
  }

  return false;
}

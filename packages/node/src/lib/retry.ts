import { AxiosError, AxiosInstance } from 'axios';
import axiosRetry, { isNetworkError } from 'axios-retry';
import { v4 as uuid } from 'uuid';
import { INovuConfiguration } from './novu.interface';

export const RETRYABLE_HTTP_CODES = [408, 422, 429];
const NON_IDEMPOTENT_METHODS = ['post', 'patch'];
const IDEMPOTENCY_KEY = 'Idempotency-Key'; // header key

const DEFAULT_RETRY_MAX = 0;
const DEFAULT_WAIT_MIN = 1;
const DEFAULT_WAIT_MAX = 30;

export function makeRetryable(
  axios: AxiosInstance,
  config?: INovuConfiguration
) {
  axios.interceptors.request.use((axiosConfig) => {
    if (
      axiosConfig.method &&
      NON_IDEMPOTENT_METHODS.includes(axiosConfig.method)
    ) {
      const idempotencyKey = axiosConfig.headers[IDEMPOTENCY_KEY];
      // that means intercepted request is retried, so don't generate new idempotency key
      if (idempotencyKey) {
        return axiosConfig;
      }

      axiosConfig.headers[IDEMPOTENCY_KEY] = uuid();
    }

    return axiosConfig;
  });

  const retryConfig = config?.retryConfig || {};
  const retries = retryConfig.retryMax || DEFAULT_RETRY_MAX;
  const minDelay = retryConfig.waitMin || DEFAULT_WAIT_MIN;
  const maxDelay = retryConfig.waitMax || DEFAULT_WAIT_MAX;
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
        requestConfig.headers[IDEMPOTENCY_KEY] = uuid();
      }
    },
  });
}

export function defaultRetryCondition(err: AxiosError): boolean {
  // retry on TCP/IP error codes like ECONNRESET
  if (isNetworkError(err)) {
    return true;
  }

  if (
    err.response &&
    err.response.status >= 500 &&
    err.response.status <= 599
  ) {
    return true;
  }

  if (err.response && RETRYABLE_HTTP_CODES.includes(err.response.status)) {
    return true;
  }

  return false;
}

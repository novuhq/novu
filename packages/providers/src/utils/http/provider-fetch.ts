import { PROVIDER_HTTP_TIMEOUT_MS } from './provider-http.constants';

export interface ProviderFetchOptions {
  /** Overrides {@link PROVIDER_HTTP_TIMEOUT_MS} for providers that need a different cap. */
  timeoutMs?: number;
}

/**
 * The `fetch` equivalent of {@link createProviderHttpClient}, for the handful of
 * providers whose transport is `fetch` rather than axios.
 *
 * `init` is forwarded untouched apart from `signal`, so non-standard options that
 * individual providers rely on survive. A caller-supplied `signal` is composed with
 * the timeout signal rather than replaced.
 *
 * Engines are Node 22, which has `AbortSignal.any` and `AbortSignal.timeout`.
 */
export const providerFetch = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: ProviderFetchOptions = {}
): Promise<Response> => {
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? PROVIDER_HTTP_TIMEOUT_MS);
  const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;

  return fetch(input, { ...init, signal });
};

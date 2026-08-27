import { isTimeoutError } from './is-timeout-error';
import { PROVIDER_HTTP_TIMEOUT_MS } from './provider-http.constants';
import { notifyProviderHttpCall } from './provider-http.observer';

export interface ProviderFetchOptions {
  /** Provider id, used only to label observability events. */
  providerId?: string;
  /** Channel name, used only to label observability events. */
  channel?: string;
  /** Overrides {@link PROVIDER_HTTP_TIMEOUT_MS} for providers that need a different cap. */
  timeoutMs?: number;
}

/**
 * `AbortSignal.any` is only available from Node 20, and the composition is cheap
 * enough to do by hand for older runtimes.
 */
const composeSignals = (signals: AbortSignal[]): AbortSignal => {
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(signals);
  }

  const controller = new AbortController();

  const abort = (signal: AbortSignal) => {
    controller.abort(signal.reason);
  };

  for (const signal of signals) {
    if (signal.aborted) {
      abort(signal);
      break;
    }

    signal.addEventListener('abort', () => abort(signal), { once: true });
  }

  return controller.signal;
};

/**
 * The `fetch` equivalent of {@link createProviderHttpClient}, for the handful of
 * providers whose transport is `fetch` rather than axios.
 *
 * `init` is forwarded untouched apart from `signal`, so non-standard options that
 * individual providers rely on survive. A caller-supplied `signal` is composed with
 * the timeout signal rather than replaced.
 */
export const providerFetch = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: ProviderFetchOptions = {}
): Promise<Response> => {
  const { providerId, channel, timeoutMs } = options;

  const timeoutSignal = AbortSignal.timeout(timeoutMs ?? PROVIDER_HTTP_TIMEOUT_MS);
  const signal = init.signal ? composeSignals([init.signal, timeoutSignal]) : timeoutSignal;

  const startedAt = Date.now();

  const emit = (timedOut: boolean) => {
    notifyProviderHttpCall({
      providerId,
      channel,
      durationMs: Date.now() - startedAt,
      timedOut,
    });
  };

  try {
    const response = await fetch(input, { ...init, signal });

    emit(false);

    return response;
  } catch (error) {
    emit(isTimeoutError(error) || timeoutSignal.aborted);

    throw error;
  }
};

export interface ProviderHttpCallEvent {
  providerId?: string;
  channel?: string;
  durationMs: number;
  timedOut: boolean;
}

export type ProviderHttpObserver = (event: ProviderHttpCallEvent) => void;

let observer: ProviderHttpObserver | undefined;

/**
 * Registers a sink for provider HTTP call timings. This package has no logger of its
 * own, so the worker and API bootstrap supply one that forwards to their existing
 * `Logger` and `MetricsService`. Unset by default, which makes every call a no-op.
 */
export const setProviderHttpObserver = (fn: ProviderHttpObserver | undefined): void => {
  observer = fn;
};

export const notifyProviderHttpCall = (event: ProviderHttpCallEvent): void => {
  if (!observer) {
    return;
  }

  try {
    observer(event);
  } catch {
    // Instrumentation must never be able to fail a send.
  }
};

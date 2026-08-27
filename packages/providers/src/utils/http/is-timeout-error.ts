/**
 * Identifies a request aborted by our own time cap, as opposed to any other failure.
 * Only used to label observability events.
 *
 * Axios reports its `timeout` as `ECONNABORTED`, or as `ETIMEDOUT` when
 * `transitional.clarifyTimeoutError` is set. `AbortSignal.timeout` rejects with a
 * `DOMException` named `TimeoutError`.
 */
export const isTimeoutError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const { code, name } = error as { code?: unknown; name?: unknown };

  return code === 'ECONNABORTED' || code === 'ETIMEDOUT' || name === 'TimeoutError';
};

/**
 * One signal that aborts as soon as any of `signals` does, with that signal's reason. A stand-in for
 * `AbortSignal.any`, which needs Node 20.3+. Returns `undefined` when no signal is given.
 */
export function anySignal(signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
  const present = signals.filter((signal): signal is AbortSignal => signal !== undefined);
  if (present.length <= 1) {
    return present[0];
  }

  const controller = new AbortController();
  const abort = (signal: AbortSignal) => {
    if (controller.signal.aborted) return;
    controller.abort(signal.reason);
    for (const other of present) other.removeEventListener('abort', onAbort);
  };
  const onAbort = (event: Event) => abort(event.target as AbortSignal);

  for (const signal of present) {
    if (signal.aborted) {
      abort(signal);

      return controller.signal;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  }

  return controller.signal;
}

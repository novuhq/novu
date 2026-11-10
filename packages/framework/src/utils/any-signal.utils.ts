export interface CombinedSignal {
  /** Aborts as soon as any source signal does, with its reason. `undefined` when no signal was given. */
  signal: AbortSignal | undefined;
  /** Detaches from the source signals. A long-lived source otherwise keeps one listener per call. */
  dispose: () => void;
}

/**
 * One signal that aborts as soon as any of `signals` does, with that signal's reason. A stand-in for
 * `AbortSignal.any`, which needs Node 20.3+. Call `dispose` once the work it guards has ended.
 */
export function anySignal(signals: Array<AbortSignal | undefined>): CombinedSignal {
  const present = signals.filter((signal): signal is AbortSignal => signal !== undefined);
  if (present.length <= 1) {
    return { signal: present[0], dispose: () => undefined };
  }

  const controller = new AbortController();
  const dispose = () => {
    for (const signal of present) signal.removeEventListener('abort', onAbort);
  };
  const onAbort = (event: Event) => {
    dispose();
    controller.abort((event.target as AbortSignal).reason);
  };

  const alreadyAborted = present.find((signal) => signal.aborted);
  if (alreadyAborted) {
    controller.abort(alreadyAborted.reason);

    return { signal: controller.signal, dispose };
  }

  for (const signal of present) signal.addEventListener('abort', onAbort, { once: true });

  return { signal: controller.signal, dispose };
}

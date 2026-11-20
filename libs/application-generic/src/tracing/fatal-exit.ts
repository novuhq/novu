const NEW_RELIC_FLUSH_TIMEOUT_MS = 5_000;

/**
 * Reports a fatal boot error to New Relic and exits once the agent has harvested it.
 *
 * Boot errors are written via `console` (New Relic only forwards instrumented loggers such as
 * pino) and a bare `process.exit()` drops whatever the agent still has queued, so both the
 * explicit record and the flush are required for the error to show up.
 */
export async function reportFatalErrorAndExit(message: string, error: unknown): Promise<never> {
  console.error(message, error);

  try {
    /*
     * Lazy require: this module is reachable from each app's `main.ts` before `instrument.ts`
     * runs, and loading `newrelic` at module scope would start the agent ahead of startOtel().
     */
    // biome-ignore lint: see comment above
    const newrelic = require('newrelic');
    const err = error instanceof Error ? error : new Error(String(error));

    newrelic.recordLogEvent({ message: `${message}: ${err.message}`, level: 'FATAL', error: err });

    await new Promise<void>((resolve) => {
      // The agent only honours `timeout` while still connecting; this guards a slow final harvest.
      const fallback = setTimeout(resolve, NEW_RELIC_FLUSH_TIMEOUT_MS + 1_000);

      newrelic.shutdown({ collectPendingData: true, timeout: NEW_RELIC_FLUSH_TIMEOUT_MS }, () => {
        clearTimeout(fallback);
        resolve();
      });
    });
  } catch {
    // Reporting must never mask the original failure.
  }

  process.exit(1);
}

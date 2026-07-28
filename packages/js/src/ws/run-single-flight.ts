type SingleFlightState = {
  current?: Promise<void>;
};

/**
 * Ensures concurrent callers share a single in-flight async task.
 * Cleared only by that task's own `.finally`, so waiters cannot wipe a
 * newer attempt started after the first completed.
 */
export async function runSingleFlight(state: SingleFlightState, task: () => Promise<void>): Promise<void> {
  if (!state.current) {
    const inFlight = task().finally(() => {
      if (state.current === inFlight) {
        state.current = undefined;
      }
    });
    state.current = inFlight;
  }

  await state.current;
}

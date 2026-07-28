import { runSingleFlight } from './run-single-flight';

describe('runSingleFlight', () => {
  test('shares one in-flight task across concurrent callers', async () => {
    const state: { current?: Promise<void> } = {};
    let runs = 0;

    const task = async () => {
      runs += 1;
      await Promise.resolve();
    };

    await Promise.all([runSingleFlight(state, task), runSingleFlight(state, task), runSingleFlight(state, task)]);

    expect(runs).toBe(1);
    expect(state.current).toBeUndefined();
  });

  test('allows a new run after the previous in-flight task settles', async () => {
    const state: { current?: Promise<void> } = {};
    let runs = 0;

    const run = () =>
      runSingleFlight(state, async () => {
        runs += 1;
      });

    await run();
    await run();

    expect(runs).toBe(2);
  });

  test('clears in-flight state when the task rejects so callers can retry', async () => {
    const state: { current?: Promise<void> } = {};
    let shouldFail = true;

    const run = () =>
      runSingleFlight(state, async () => {
        if (shouldFail) {
          throw new Error('boom');
        }
      });

    await expect(run()).rejects.toThrow('boom');
    expect(state.current).toBeUndefined();

    shouldFail = false;
    await expect(run()).resolves.toBeUndefined();
  });
});

/**
 * Captures `QUEUE_BACKEND` now and returns a hook that puts it back.
 *
 * The backend predicates read `process.env` on every call so tests can flip the
 * value between cases, which means every suite that flips it has to restore it
 * or it leaks into the next file.
 *
 * Usage: `afterEach(restoreQueueBackendEnv())`.
 */
export function restoreQueueBackendEnv(): () => void {
  const original = process.env.QUEUE_BACKEND;

  return () => {
    if (original === undefined) {
      delete process.env.QUEUE_BACKEND;
    } else {
      process.env.QUEUE_BACKEND = original;
    }
  };
}

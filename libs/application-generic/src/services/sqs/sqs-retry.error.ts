/**
 * Signals that a failed message should be retried after a specific delay.
 *
 * SQS has no per-message retry cadence of its own - a message that is not
 * deleted simply reappears when its visibility timeout lapses, giving every
 * attempt the same flat interval. Workers that want BullMQ's per-attempt
 * backoff throw this so the consumer can translate the delay into a
 * `ChangeMessageVisibility` call.
 */
export class SqsRetryError extends Error {
  constructor(
    public readonly cause: Error,
    public readonly retryDelayMs: number
  ) {
    super(cause.message);
    this.name = 'SqsRetryError';
  }
}

export function isSqsRetryError(error: unknown): error is SqsRetryError {
  return error instanceof SqsRetryError;
}

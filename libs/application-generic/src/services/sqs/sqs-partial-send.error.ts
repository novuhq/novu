import { ISqsMessage } from './types';

/**
 * Raised when a bulk send delivered some messages but not others.
 *
 * `sqs-producer` gives the caller no way to tell what landed: when the
 * underlying command throws (`BatchRequestTooLong`, throttling, a network
 * blip) the raw AWS error propagates and every message already accepted by an
 * earlier batch is forgotten. Callers that fall back to another backend then
 * re-send the whole array and duplicate the delivered ones.
 *
 * Carrying the unsent messages lets the fallback re-queue exactly those.
 */
export class SqsPartialSendError extends Error {
  /**
   * Named `unsentMessages` rather than `failedMessages` to stay clearly distinct
   * from `sqs-producer`'s `FailedMessagesError.failedMessages`, which holds
   * entry id strings rather than messages and is duck-typed for elsewhere.
   */
  constructor(
    public readonly unsentMessages: ISqsMessage[],
    public readonly sentCount: number,
    public readonly cause?: unknown
  ) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Sent ${sentCount} SQS message(s), ${unsentMessages.length} unsent: ${reason}`);
    this.name = 'SqsPartialSendError';
  }
}

export function isSqsPartialSendError(error: unknown): error is SqsPartialSendError {
  return error instanceof SqsPartialSendError;
}

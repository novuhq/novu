import { Job } from '../bull-mq';
import { ISqsMessageMeta } from './types';

const noOp = async () => {};

/**
 * Adapts SQS message data into a BullMQ Job-compatible shape.
 * Properties that don't apply to SQS are safe no-ops or sensible defaults.
 */
export function createSqsJobAdapter<T = any>(
  data: T,
  meta: ISqsMessageMeta,
  topicName: string,
  jobId: string
): Job<T, unknown, string> {
  return {
    id: jobId,
    name: topicName,
    data,
    attemptsMade: meta.receiveCount,
    opts: {},
    timestamp: Date.now(),
    returnvalue: undefined,
    failedReason: undefined,
    stacktrace: [],
    progress: noOp,
    log: noOp as any,
    remove: noOp,
    updateData: noOp as any,
    updateProgress: noOp as any,
    moveToFailed: noOp as any,
    extendLock: noOp as any,
    isCompleted: async () => false,
    isFailed: async () => false,
    isDelayed: async () => false,
    isActive: async () => true,
    isWaiting: async () => false,
    getState: async () => 'active' as any,
    changePriority: noOp as any,
    asJSON: () =>
      ({
        id: jobId,
        name: topicName,
        data,
        attemptsMade: meta.receiveCount,
        opts: {},
      }) as any,
  } as unknown as Job<T, unknown, string>;
}

export const SQS_DEFAULT_BATCH_SIZE = 10;
export const SQS_DEFAULT_WAIT_TIME_SECONDS = 20;
export const SQS_DEFAULT_VISIBILITY_TIMEOUT = 90;
export const SQS_DEFAULT_MAX_CONCURRENCY = 30;
export const SQS_MAX_DELAY_SECONDS = 900;
export const SQS_DEFAULT_DRAIN_TIMEOUT_MS = 30_000;

export interface ISqsConsumerOptions {
  maxNumberOfMessages?: number;
  waitTimeSeconds?: number;
  visibilityTimeout?: number;
  maxConcurrency?: number;
  drainTimeoutMs?: number;
}

export interface ISqsMessage {
  id: string;
  body: string;
  groupId: string;
  delaySeconds?: number;
}

export interface ISqsMessageMeta {
  messageId: string;
  receiveCount: number;
}

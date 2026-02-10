export const SQS_DEFAULT_BATCH_SIZE = 10;
export const SQS_DEFAULT_WAIT_TIME_SECONDS = 20;
export const SQS_DEFAULT_VISIBILITY_TIMEOUT = 90;
export const SQS_DEFAULT_MAX_CONCURRENCY = 30;

export interface ISqsConsumerOptions {
  maxNumberOfMessages?: number;
  waitTimeSeconds?: number;
  visibilityTimeout?: number;
  maxConcurrency?: number;
}

export interface ISqsMessageMeta {
  messageId: string;
  receiveCount: number;
}

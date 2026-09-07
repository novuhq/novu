export const SQS_DEFAULT_BATCH_SIZE = 10;
export const SQS_DEFAULT_WAIT_TIME_SECONDS = 20;
export const SQS_DEFAULT_VISIBILITY_TIMEOUT = 90;
export const SQS_DEFAULT_MAX_CONCURRENCY = 30;
export const SQS_MAX_DELAY_SECONDS = 900;
export const SQS_DEFAULT_DRAIN_TIMEOUT_MS = 30_000;
export const SQS_MAX_MESSAGE_SIZE_BYTES = 1_048_576;

/**
 * Body size above which a payload is offloaded to S3 and replaced by a pointer.
 *
 * Well below the 1 MiB ceiling on purpose: this is a tail-risk cap that stops
 * one big message from monopolising a batch, not an attempt to offload normal
 * traffic (observed `process_subscriber` bodies are 117-148 KB and stay inline).
 * Every offload costs a `PutObject` on send and a `GetObject` on receive, so
 * lowering it further trades queue headroom for hot-path latency. Overridable
 * via `SQS_PAYLOAD_SIZE_THRESHOLD`.
 */
export const SQS_DEFAULT_PAYLOAD_SIZE_THRESHOLD = 256_000;

/**
 * Entries per `SendMessageBatch`, also pinned as the `sqs-producer` `batchSize`
 * so a group of this size is guaranteed to become exactly one API call - which
 * is what makes the byte budget below meaningful.
 */
export const SQS_MAX_BATCH_ENTRIES = 10;

/**
 * Byte ceiling for one `SendMessageBatch`, at 90% of the hard 1 MiB limit.
 * AWS counts the aggregate of all entries, and does not document precisely how
 * much the AWS-JSON envelope contributes, so the 10% headroom absorbs it.
 */
export const SQS_BATCH_BYTE_BUDGET = Math.floor(SQS_MAX_MESSAGE_SIZE_BYTES * 0.9);

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

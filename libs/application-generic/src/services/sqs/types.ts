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

/**
 * Upper bound on how long the consumer keeps renewing a message's visibility.
 * Past this the heartbeat stops and visibility lapses, so a wedged processor
 * releases its message instead of pinning it until AWS's hard 12h ceiling.
 *
 * Note this bounds the *message*, not the processor: the in-flight run is not
 * aborted, so what happens next depends on the topic. On `standard` the
 * redelivered copy cannot claim the still-running job and acks as a no-op, so
 * the message is deleted rather than redriven. On the topics with
 * `maxReceiveCount=1` a single lapse routes straight to the DLQ. Either way the
 * error log is the signal to act on; the ceiling only stops the message from
 * being held indefinitely.
 */
export const SQS_MAX_VISIBILITY_RENEWAL_MS = 1_800_000;

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

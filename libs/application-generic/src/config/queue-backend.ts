import { JobTopicNameEnum, QueueBackend } from '@novu/shared';

/**
 * Queue URL env var per topic. Shared by `SqsService` and the per-process
 * validators so the name a deployment sets and the name a boot check demands
 * cannot drift.
 */
export const SQS_QUEUE_URL_ENV_BY_TOPIC: Partial<Record<JobTopicNameEnum, string>> = {
  [JobTopicNameEnum.STANDARD]: 'SQS_QUEUE_URL_STANDARD',
  [JobTopicNameEnum.WORKFLOW]: 'SQS_QUEUE_URL_WORKFLOW',
  [JobTopicNameEnum.PROCESS_SUBSCRIBER]: 'SQS_QUEUE_URL_PROCESS_SUBSCRIBER',
  [JobTopicNameEnum.WEB_SOCKETS]: 'SQS_QUEUE_URL_WEB_SOCKETS',
  [JobTopicNameEnum.INBOUND_PARSE_MAIL]: 'SQS_QUEUE_URL_INBOUND_PARSE_MAIL',
};

export const EVENTBRIDGE_SCHEDULER_ENV_VARS = [
  'EVENTBRIDGE_SCHEDULER_GROUP_PREFIX',
  'EVENTBRIDGE_SCHEDULER_ROLE_ARN',
  'EVENTBRIDGE_SCHEDULER_DLQ_ARN',
] as const;

const QUEUE_BACKENDS = Object.values(QueueBackend);

function isQueueBackend(value: string): value is QueueBackend {
  return (QUEUE_BACKENDS as string[]).includes(value);
}

/**
 * Read from `process.env` on every call rather than caching: tests flip the var
 * between cases, and the cost is a property lookup on a path that already does
 * Redis or AWS I/O.
 */
export function getQueueBackend(env: NodeJS.ProcessEnv = process.env): QueueBackend {
  const raw = env.QUEUE_BACKEND?.trim();

  if (!raw) {
    return QueueBackend.BULLMQ;
  }

  /*
   * Default rather than throw. An unrecognised value on a hot enqueue path must
   * not take the process down, and BullMQ is the backend every deployment has.
   * The validators reject bad values at boot, so this is a backstop.
   */
  return isQueueBackend(raw) ? raw : QueueBackend.BULLMQ;
}

interface IQueueCapabilities {
  /** A BullMQ worker runs, and BullMQ can still be produced to. */
  runsBullMq: boolean;
  /** Producers route to SQS rather than BullMQ. */
  producesToSqs: boolean;
}

/**
 * The whole three-state model in one table, so adding a fourth backend is a
 * compile error here rather than a silent default somewhere downstream.
 */
function queueCapabilities(backend: QueueBackend): IQueueCapabilities {
  switch (backend) {
    case QueueBackend.BULLMQ:
      return { runsBullMq: true, producesToSqs: false };
    case QueueBackend.SQS_BULLMQ:
      return { runsBullMq: true, producesToSqs: true };
    case QueueBackend.SQS:
      return { runsBullMq: false, producesToSqs: true };
    default: {
      const exhaustive: never = backend;
      throw new Error(`Unhandled queue backend: ${exhaustive}`);
    }
  }
}

/** True while a BullMQ worker runs and BullMQ can still be produced to. */
export function isBullMqEnabled(): boolean {
  return queueCapabilities(getQueueBackend()).runsBullMq;
}

/** True when producers route to SQS, with or without the BullMQ backup. */
export function isSqsPrimary(): boolean {
  return queueCapabilities(getQueueBackend()).producesToSqs;
}

/**
 * Boot-time check for the env a given process needs, given its `QUEUE_BACKEND`.
 *
 * Each service is validated against the topics it actually uses: the ws service
 * only touches `ws_socket_queue`, so demanding the standard or workflow URLs
 * from it would block a correct deployment.
 *
 * Returns the problems rather than throwing so the caller can report all of
 * them at once, the way envalid does.
 */
export function collectQueueBackendConfigErrors({
  topics,
  requiresScheduler = false,
  requiresPayloadOffload = false,
  env = process.env,
}: {
  topics: JobTopicNameEnum[];
  requiresScheduler?: boolean;
  requiresPayloadOffload?: boolean;
  env?: NodeJS.ProcessEnv;
}): string[] {
  const raw = env.QUEUE_BACKEND?.trim();

  if (raw && !isQueueBackend(raw)) {
    return [`QUEUE_BACKEND must be one of ${QUEUE_BACKENDS.join(', ')} (received "${raw}")`];
  }

  const backend = getQueueBackend(env);

  if (backend === QueueBackend.BULLMQ) {
    return [];
  }

  const errors: string[] = [];

  for (const topic of topics) {
    const envVar = SQS_QUEUE_URL_ENV_BY_TOPIC[topic];

    if (envVar && !env[envVar]?.trim()) {
      errors.push(`${envVar} is required when QUEUE_BACKEND=${backend} (topic: ${topic})`);
    }
  }

  /*
   * Only meaningful once BullMQ is gone. While it is still there a long delay
   * that cannot be scheduled falls back to the BullMQ delayed set, which is
   * exactly the pre-migration behavior.
   */
  if (requiresScheduler && backend === QueueBackend.SQS) {
    for (const envVar of EVENTBRIDGE_SCHEDULER_ENV_VARS) {
      if (!env[envVar]?.trim()) {
        errors.push(
          `${envVar} is required when QUEUE_BACKEND=${QueueBackend.SQS}, ` +
            'otherwise delays beyond 900s have no backend left to fire them'
        );
      }
    }
  }

  /*
   * Inbound mail attachments run to 5 MB against a 1 MiB SQS ceiling, so the
   * S3 offload is not optional for that queue the way it is for the others.
   */
  if (requiresPayloadOffload && !env.SQS_PAYLOAD_OFFLOAD_BUCKET?.trim()) {
    errors.push(
      `SQS_PAYLOAD_OFFLOAD_BUCKET is required when QUEUE_BACKEND=${backend}, ` +
        'because inbound mail attachments can exceed the 1 MiB SQS message limit'
    );
  }

  return errors;
}

/** Throws with every problem at once so one boot surfaces the whole gap. */
export function assertQueueBackendConfig(params: Parameters<typeof collectQueueBackendConfigErrors>[0]): void {
  const errors = collectQueueBackendConfigErrors(params);

  if (errors.length > 0) {
    throw new Error(`Invalid queue backend configuration:\n - ${errors.join('\n - ')}`);
  }
}

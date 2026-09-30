import { JobTopicNameEnum, QueueBackend } from '@novu/shared';

/**
 * Queues each worker produces to, on top of the topic it consumes.
 *
 * Kept free of worker-class imports so `env.validators` can resolve the topics
 * a process needs without pulling the whole Nest graph in before the env has
 * been checked.
 */
export const WORKER_QUEUE_DEPENDENCIES: Partial<Record<JobTopicNameEnum, JobTopicNameEnum[]>> = {
  [JobTopicNameEnum.STANDARD]: [
    JobTopicNameEnum.WEB_SOCKETS,
    JobTopicNameEnum.STANDARD,
    JobTopicNameEnum.PROCESS_SUBSCRIBER,
  ],
  [JobTopicNameEnum.WORKFLOW]: [
    JobTopicNameEnum.PROCESS_SUBSCRIBER,
    JobTopicNameEnum.STANDARD,
    JobTopicNameEnum.WEB_SOCKETS,
  ],
  [JobTopicNameEnum.PROCESS_SUBSCRIBER]: [
    JobTopicNameEnum.STANDARD,
    JobTopicNameEnum.WEB_SOCKETS,
    JobTopicNameEnum.PROCESS_SUBSCRIBER,
  ],
  [JobTopicNameEnum.INBOUND_PARSE_MAIL]: [],
};

export const ALL_WORKER_TOPICS = Object.keys(WORKER_QUEUE_DEPENDENCIES) as JobTopicNameEnum[];

/**
 * Workers that stay on BullMQ when the deployment produces to SQS.
 *
 * `metric-active-jobs` records BullMQ queue counters, so it has no SQS queue
 * and must not be asked for a queue URL. Deployments still list it in
 * `ACTIVE_WORKERS`; dropping it here crash-loops the process at boot.
 */
export const BULLMQ_ONLY_WORKER_TOPICS: JobTopicNameEnum[] = [JobTopicNameEnum.ACTIVE_JOBS_METRIC];

const ACCEPTED_ACTIVE_WORKERS = [...ALL_WORKER_TOPICS, ...BULLMQ_ONLY_WORKER_TOPICS];

function isAcceptedActiveWorker(value: string): value is JobTopicNameEnum {
  return (ACCEPTED_ACTIVE_WORKERS as string[]).includes(value);
}

/**
 * Workers this process runs, from `ACTIVE_WORKERS`. Empty means all of them.
 *
 * Validated here rather than where the worker classes are wired up, because
 * `env.validators` derives the SQS queue urls it demands from this list. An
 * unrecognised name resolving to no topics would let a misconfigured process
 * pass boot validation with nothing checked at all, and only fail later when
 * the module graph is built.
 *
 * BullMQ-only names stay in the list so a process whose only entry is
 * `metric-active-jobs` is not treated as "run every worker". That same list is
 * rejected once BullMQ is retired: nothing would be left to run.
 */
export function parseActiveWorkers(raw: string | undefined, env: NodeJS.ProcessEnv = process.env): JobTopicNameEnum[] {
  const workers = (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (!isAcceptedActiveWorker(entry)) {
        throw new Error(
          `Invalid worker "${entry}" in ACTIVE_WORKERS. Expected one of: ${ACCEPTED_ACTIVE_WORKERS.join(', ')}`
        );
      }

      return entry;
    });

  assertBullMqWorkersCanRun(workers, env);

  return workers;
}

/**
 * `sqs` retires BullMQ, and these topics have no SQS consumer. A process whose
 * whole `ACTIVE_WORKERS` list is made of them would pass boot and then sit idle.
 * A list that also names an SQS worker still starts that worker; the metrics
 * entry is ignored because there are no BullMQ counters left to read.
 */
function assertBullMqWorkersCanRun(workers: JobTopicNameEnum[], env: NodeJS.ProcessEnv): void {
  const bullMqRetired = env.QUEUE_BACKEND?.trim() === QueueBackend.SQS;
  const hasSqsWorker = workers.some((topic) => !BULLMQ_ONLY_WORKER_TOPICS.includes(topic));

  if (!bullMqRetired || workers.length === 0 || hasSqsWorker) {
    return;
  }

  throw new Error(
    `ACTIVE_WORKERS is "${workers.join(', ')}", which only runs while BullMQ is enabled. ` +
      `QUEUE_BACKEND=${QueueBackend.SQS} disables BullMQ, so this process would start with no worker`
  );
}

export const workersToProcess: JobTopicNameEnum[] = parseActiveWorkers(process.env.ACTIVE_WORKERS, process.env);

/**
 * Every SQS topic this worker process touches: the ones its active workers
 * consume plus the ones they enqueue to. A sharded worker
 * (`ACTIVE_WORKERS=standard`) must not be asked for queue URLs it never uses.
 *
 * BullMQ-only workers are omitted. In `sqs_bullmq` they keep running against
 * BullMQ and have nothing to configure on SQS.
 */
export function getRequiredWorkerTopics(active: JobTopicNameEnum[] = workersToProcess): JobTopicNameEnum[] {
  const sqsWorkers = active.filter((topic) => !BULLMQ_ONLY_WORKER_TOPICS.includes(topic));
  const topics = active.length > 0 ? sqsWorkers : ALL_WORKER_TOPICS;

  return [...new Set(topics.flatMap((topic) => [topic, ...(WORKER_QUEUE_DEPENDENCIES[topic] ?? [])]))];
}

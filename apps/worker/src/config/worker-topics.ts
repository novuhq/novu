import { JobTopicNameEnum } from '@novu/shared';

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

function isWorkerTopic(value: string): value is JobTopicNameEnum {
  return (ALL_WORKER_TOPICS as string[]).includes(value);
}

/**
 * Workers this process runs, from `ACTIVE_WORKERS`. Empty means all of them.
 *
 * Validated here rather than where the worker classes are wired up, because
 * `env.validators` derives the SQS queue urls it demands from this list. An
 * unrecognised name resolving to no topics would let a misconfigured process
 * pass boot validation with nothing checked at all, and only fail later when
 * the module graph is built.
 */
export const workersToProcess: JobTopicNameEnum[] = (process.env.ACTIVE_WORKERS ?? '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    if (!isWorkerTopic(entry)) {
      throw new Error(`Invalid worker "${entry}" in ACTIVE_WORKERS. Expected one of: ${ALL_WORKER_TOPICS.join(', ')}`);
    }

    return entry;
  });

/**
 * Every topic this worker process touches: the ones its active workers consume
 * plus the ones they enqueue to. A sharded worker (`ACTIVE_WORKERS=standard`)
 * must not be asked for queue URLs it never uses.
 */
export function getRequiredWorkerTopics(active: JobTopicNameEnum[] = workersToProcess): JobTopicNameEnum[] {
  const topics = active.length > 0 ? active : ALL_WORKER_TOPICS;

  return [...new Set(topics.flatMap((topic) => [topic, ...(WORKER_QUEUE_DEPENDENCIES[topic] ?? [])]))];
}

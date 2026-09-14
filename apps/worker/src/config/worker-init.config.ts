import { Provider } from '@nestjs/common';

import { JobTopicNameEnum } from '@novu/shared';

import { StandardWorker, WorkflowWorker } from '../app/workflow/services';
import { SubscriberProcessWorker } from '../app/workflow/services/subscriber-process.worker';
import { InboundParseWorker } from '../app/workflow/workers/inbound-parse.worker.service';
import { ALL_WORKER_TOPICS, WORKER_QUEUE_DEPENDENCIES, workersToProcess } from './worker-topics';

type WorkerClass =
  | typeof StandardWorker
  | typeof WorkflowWorker
  | typeof SubscriberProcessWorker
  | typeof InboundParseWorker;

/*
 * The topic list and its queue dependencies live in `worker-topics` so
 * `env.validators` can read them without importing these worker classes, which
 * would drag the Nest graph in before the env has been validated.
 */
const WORKER_CLASS_BY_TOPIC: Record<JobTopicNameEnum, WorkerClass | undefined> = {
  [JobTopicNameEnum.STANDARD]: StandardWorker,
  [JobTopicNameEnum.WORKFLOW]: WorkflowWorker,
  [JobTopicNameEnum.PROCESS_SUBSCRIBER]: SubscriberProcessWorker,
  [JobTopicNameEnum.INBOUND_PARSE_MAIL]: InboundParseWorker,
  [JobTopicNameEnum.WEB_SOCKETS]: undefined,
  [JobTopicNameEnum.ACTIVE_JOBS_METRIC]: undefined,
};

export { workersToProcess };

export const UNIQUE_WORKER_DEPENDENCIES = [
  ...new Set(workersToProcess.flatMap((worker) => WORKER_QUEUE_DEPENDENCIES[worker] ?? [])),
];

const ACTIVE_WORKER_TOPICS = workersToProcess.length > 0 ? workersToProcess : ALL_WORKER_TOPICS;

export const ACTIVE_WORKERS: Provider[] = ACTIVE_WORKER_TOPICS.flatMap(
  (topic) => WORKER_CLASS_BY_TOPIC[topic] ?? []
);

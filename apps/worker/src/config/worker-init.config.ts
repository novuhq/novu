import { Provider } from '@nestjs/common';

import { JobTopicNameEnum } from '@novu/shared';

import { ExecutionLogWorker, StandardWorker, WorkflowWorker } from '../app/workflow/services';
import { SubscriberProcessWorker } from '../app/workflow/services/subscriber-process.worker';
import { InboundParseWorker } from '../app/workflow/workers/inbound-parse.worker.service';

type WorkerClass =
  | typeof StandardWorker
  | typeof WorkflowWorker
  | typeof ExecutionLogWorker
  | typeof SubscriberProcessWorker
  | typeof InboundParseWorker;

type WorkerModuleTree = { workerClass: WorkerClass; queueDependencies: JobTopicNameEnum[] };

type WorkerDepTree = Partial<Record<JobTopicNameEnum, WorkerModuleTree>>;

export const WORKER_MAPPING: WorkerDepTree = {
  [JobTopicNameEnum.STANDARD]: {
    workerClass: StandardWorker,
    queueDependencies: [
      JobTopicNameEnum.EXECUTION_LOG,
      JobTopicNameEnum.WEB_SOCKETS,
      JobTopicNameEnum.STANDARD,
      JobTopicNameEnum.PROCESS_SUBSCRIBER,
    ],
  },
  [JobTopicNameEnum.WORKFLOW]: {
    workerClass: WorkflowWorker,
    queueDependencies: [
      JobTopicNameEnum.EXECUTION_LOG,
      JobTopicNameEnum.PROCESS_SUBSCRIBER,
      JobTopicNameEnum.STANDARD,
      JobTopicNameEnum.WEB_SOCKETS,
    ],
  },
  [JobTopicNameEnum.EXECUTION_LOG]: {
    workerClass: ExecutionLogWorker,
    queueDependencies: [
      JobTopicNameEnum.EXECUTION_LOG,
      JobTopicNameEnum.STANDARD,
      JobTopicNameEnum.WEB_SOCKETS,
      JobTopicNameEnum.PROCESS_SUBSCRIBER,
    ],
  },
  [JobTopicNameEnum.PROCESS_SUBSCRIBER]: {
    workerClass: SubscriberProcessWorker,
    queueDependencies: [
      JobTopicNameEnum.EXECUTION_LOG,
      JobTopicNameEnum.STANDARD,
      JobTopicNameEnum.WEB_SOCKETS,
      JobTopicNameEnum.PROCESS_SUBSCRIBER,
    ],
  },
  [JobTopicNameEnum.INBOUND_PARSE_MAIL]: {
    workerClass: InboundParseWorker,
    queueDependencies: [],
  },
};

const validQueueEntries = Object.keys(JobTopicNameEnum).map((key) => JobTopicNameEnum[key]);
const isQueueEntry = (queueName: string): queueName is JobTopicNameEnum => {
  return validQueueEntries.includes(queueName);
};

export const workersToProcess =
  process.env.ACTIVE_WORKERS?.split(',')
    .filter((i) => !!i)
    .map((queue) => {
      const queueName = queue.trim();
      if (!isQueueEntry(queueName)) {
        throw new Error(`Invalid queue name ${queueName}`);
      }

      return queueName;
    }) || [];

const WORKER_DEPENDENCIES: JobTopicNameEnum[] = workersToProcess.reduce((history, worker) => {
  const workerDependencies: JobTopicNameEnum[] = WORKER_MAPPING[worker]?.queueDependencies || [];

  return [...history, ...workerDependencies];
}, []);

export const UNIQUE_WORKER_DEPENDENCIES = [...new Set(WORKER_DEPENDENCIES)];

export const ACTIVE_WORKERS: Provider[] | any[] = [];

if (!workersToProcess.length) {
  ACTIVE_WORKERS.push(StandardWorker, WorkflowWorker, ExecutionLogWorker, SubscriberProcessWorker, InboundParseWorker);
} else {
  workersToProcess.forEach((queue) => {
    const workerClass = WORKER_MAPPING[queue]?.workerClass;
    if (workerClass) {
      ACTIVE_WORKERS.push(workerClass);
    }
  });
}

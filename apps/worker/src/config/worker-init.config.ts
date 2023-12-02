import { JobTopicNameEnum } from '@novu/shared';
import { ExecutionLogWorker, StandardWorker, WorkflowWorker } from '../app/workflow/services';
import { SubscriberProcessWorker } from '../app/workflow/services/subscriber-process.worker';
import { Provider } from '@nestjs/common';

export const WORKER_MAPPING = {
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
    queueDependencies: [JobTopicNameEnum.EXECUTION_LOG],
  },
};

const validQueueEntries = Object.keys(JobTopicNameEnum).map((key) => JobTopicNameEnum[key]);
export const queuesToProcess =
  process.env.WORKER_QUEUES?.split(',').map((queue) => {
    const queueName = queue.trim();
    if (!validQueueEntries.includes(queueName)) {
      throw new Error(`Invalid queue name ${queueName}`);
    }

    return queueName;
  }) || [];

const QUEUE_DEPENDENCIES = queuesToProcess.reduce((history, queue) => {
  const queueDependencies = WORKER_MAPPING[queue]?.queueDependencies || [];

  return [...history, ...queueDependencies];
}, []);

export const UNIQUE_QUEUE_DEPENDENCIES = [...new Set(QUEUE_DEPENDENCIES)];

export const ACTIVE_WORKERS: Provider[] | any[] = [];

if (!queuesToProcess.length) {
  ACTIVE_WORKERS.push(StandardWorker, WorkflowWorker, ExecutionLogWorker, SubscriberProcessWorker);
} else {
  queuesToProcess.forEach((queue) => {
    ACTIVE_WORKERS.push(WORKER_MAPPING[queue].workerClass);
  });
}

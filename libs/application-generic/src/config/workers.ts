import { env } from './env';

enum WorkerEnum {
  INBOUND_PARSE_MAIL = 'InboundParseMailWorker',
  SUBSCRIBER_PROCESS = 'SubscriberProcessWorker',
  STANDARD = 'StandardWorker',
  WEB_SOCKET = 'WebSocketWorker',
  WORKFLOW = 'WorkflowWorker',
}

const WORKER_CONCURRENCY_ENV_MAP: Record<WorkerEnum, Extract<keyof typeof env, `${string}_WORKER_CONCURRENCY`>> = {
  [WorkerEnum.INBOUND_PARSE_MAIL]: 'INBOUND_PARSE_MAIL_WORKER_CONCURRENCY',
  [WorkerEnum.SUBSCRIBER_PROCESS]: 'SUBSCRIBER_PROCESS_WORKER_CONCURRENCY',
  [WorkerEnum.STANDARD]: 'STANDARD_WORKER_CONCURRENCY',
  [WorkerEnum.WEB_SOCKET]: 'WEB_SOCKET_WORKER_CONCURRENCY',
  [WorkerEnum.WORKFLOW]: 'WORKFLOW_WORKER_CONCURRENCY',
};

interface IWorkerConfig {
  concurrency: number;
  lockDuration: number;
}

function getWorkerConcurrency(worker: WorkerEnum, hardcodedDefault: number): number {
  return env[WORKER_CONCURRENCY_ENV_MAP[worker]] ?? env.WORKER_DEFAULT_CONCURRENCY ?? hardcodedDefault;
}

export const getSqsDefaultConcurrency = () => env.SQS_DEFAULT_CONCURRENCY;

export const getSqsDefaultVisibilityTimeout = () => {
  const value = env.SQS_DEFAULT_VISIBILITY_TIMEOUT;

  return value ? Math.min(value, 43200) : undefined;
};

export const getSqsDefaultBatchSize = () => {
  const value = env.SQS_DEFAULT_BATCH_SIZE;

  return value ? Math.min(value, 10) : undefined;
};

export const getSqsDefaultWaitTimeSeconds = () => {
  const value = env.SQS_DEFAULT_WAIT_TIME_SECONDS;

  return value ? Math.min(value, 20) : undefined;
};

const getWorkerConfig = (worker: WorkerEnum, hardcodedConcurrency: number): IWorkerConfig => ({
  concurrency: getWorkerConcurrency(worker, hardcodedConcurrency),
  lockDuration: env.WORKER_DEFAULT_LOCK_DURATION,
});

export const getInboundParseMailWorkerOptions = () => getWorkerConfig(WorkerEnum.INBOUND_PARSE_MAIL, 200);

export const getSubscriberProcessWorkerOptions = () => getWorkerConfig(WorkerEnum.SUBSCRIBER_PROCESS, 200);

export const getStandardWorkerOptions = () => getWorkerConfig(WorkerEnum.STANDARD, 200);

export const getWebSocketWorkerOptions = () => getWorkerConfig(WorkerEnum.WEB_SOCKET, 400);

export const getWorkflowWorkerOptions = () => getWorkerConfig(WorkerEnum.WORKFLOW, 200);

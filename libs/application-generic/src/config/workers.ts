enum WorkerEnum {
  INBOUND_PARSE_MAIL = 'InboundParseMailWorker',
  SUBSCRIBER_PROCESS = 'SubscriberProcessWorker',
  STANDARD = 'StandardWorker',
  WEB_SOCKET = 'WebSocketWorker',
  WORKFLOW = 'WorkflowWorker',
}

const WORKER_CONCURRENCY_ENV_MAP: Record<WorkerEnum, string> = {
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

const getDefaultConcurrency = () =>
  process.env.WORKER_DEFAULT_CONCURRENCY ? Number(process.env.WORKER_DEFAULT_CONCURRENCY) : undefined;

const getDefaultLockDuration = () =>
  process.env.WORKER_DEFAULT_LOCK_DURATION ? Number(process.env.WORKER_DEFAULT_LOCK_DURATION) : undefined;

function getWorkerConcurrency(worker: WorkerEnum, hardcodedDefault: number): number {
  const envKey = WORKER_CONCURRENCY_ENV_MAP[worker];
  const perQueueValue = process.env[envKey] ? Number(process.env[envKey]) : undefined;

  return perQueueValue ?? getDefaultConcurrency() ?? hardcodedDefault;
}

export const getSqsDefaultConcurrency = () =>
  process.env.SQS_DEFAULT_CONCURRENCY ? Number(process.env.SQS_DEFAULT_CONCURRENCY) : undefined;

export const getSqsDefaultVisibilityTimeout = () => {
  const value = process.env.SQS_DEFAULT_VISIBILITY_TIMEOUT
    ? Number(process.env.SQS_DEFAULT_VISIBILITY_TIMEOUT)
    : undefined;

  return value ? Math.min(value, 43200) : undefined;
};

export const getSqsDefaultBatchSize = () => {
  const value = process.env.SQS_DEFAULT_BATCH_SIZE ? Number(process.env.SQS_DEFAULT_BATCH_SIZE) : undefined;

  return value ? Math.min(value, 10) : undefined;
};

export const getSqsDefaultWaitTimeSeconds = () => {
  const value = process.env.SQS_DEFAULT_WAIT_TIME_SECONDS
    ? Number(process.env.SQS_DEFAULT_WAIT_TIME_SECONDS)
    : undefined;

  return value ? Math.min(value, 20) : undefined;
};

const getWorkerConfig = (worker: WorkerEnum, hardcodedConcurrency: number): IWorkerConfig => ({
  concurrency: getWorkerConcurrency(worker, hardcodedConcurrency),
  lockDuration: getDefaultLockDuration() ?? 90000,
});

export const getInboundParseMailWorkerOptions = () => getWorkerConfig(WorkerEnum.INBOUND_PARSE_MAIL, 200);

export const getSubscriberProcessWorkerOptions = () => getWorkerConfig(WorkerEnum.SUBSCRIBER_PROCESS, 200);

export const getStandardWorkerOptions = () => getWorkerConfig(WorkerEnum.STANDARD, 200);

export const getWebSocketWorkerOptions = () => getWorkerConfig(WorkerEnum.WEB_SOCKET, 400);

export const getWorkflowWorkerOptions = () => getWorkerConfig(WorkerEnum.WORKFLOW, 200);

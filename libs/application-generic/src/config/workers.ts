enum WorkerEnum {
  INBOUND_PARSE_MAIL = 'InboundParseMailWorker',
  SUBSCRIBER_PROCESS = 'SubscriberProcessWorker',
  STANDARD = 'StandardWorker',
  WEB_SOCKET = 'WebSocketWorker',
  WORKFLOW = 'WorkflowWorker',
}

interface IWorkerConfig {
  concurrency: number;
  lockDuration: number;
}

const getDefaultConcurrency = () =>
  process.env.WORKER_DEFAULT_CONCURRENCY ? Number(process.env.WORKER_DEFAULT_CONCURRENCY) : undefined;

const getDefaultLockDuration = () =>
  process.env.WORKER_DEFAULT_LOCK_DURATION ? Number(process.env.WORKER_DEFAULT_LOCK_DURATION) : undefined;

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

const getWorkerConfig = (worker: WorkerEnum): IWorkerConfig => {
  const workersConfig = {
    [WorkerEnum.INBOUND_PARSE_MAIL]: {
      concurrency: getDefaultConcurrency() ?? 200,
      lockDuration: getDefaultLockDuration() ?? 90000,
    },
    [WorkerEnum.SUBSCRIBER_PROCESS]: {
      concurrency: getDefaultConcurrency() ?? 200,
      lockDuration: getDefaultLockDuration() ?? 90000,
    },
    [WorkerEnum.STANDARD]: {
      concurrency: getDefaultConcurrency() ?? 200,
      lockDuration: getDefaultLockDuration() ?? 90000,
    },
    [WorkerEnum.WEB_SOCKET]: {
      concurrency: getDefaultConcurrency() ?? 400,
      lockDuration: getDefaultLockDuration() ?? 90000,
    },
    [WorkerEnum.WORKFLOW]: {
      concurrency: getDefaultConcurrency() ?? 200,
      lockDuration: getDefaultLockDuration() ?? 90000,
    },
  };

  return workersConfig[worker];
};

export const getInboundParseMailWorkerOptions = () => getWorkerConfig(WorkerEnum.INBOUND_PARSE_MAIL);

export const getSubscriberProcessWorkerOptions = () => getWorkerConfig(WorkerEnum.SUBSCRIBER_PROCESS);

export const getStandardWorkerOptions = () => getWorkerConfig(WorkerEnum.STANDARD);

export const getWebSocketWorkerOptions = () => getWorkerConfig(WorkerEnum.WEB_SOCKET);

export const getWorkflowWorkerOptions = () => getWorkerConfig(WorkerEnum.WORKFLOW);

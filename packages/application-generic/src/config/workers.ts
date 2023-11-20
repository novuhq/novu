enum WorkerEnum {
  INBOUND_PARSE_MAIL = 'InboundParseMailWorker',
  SUBSCRIBER_PROCESS = 'SubscriberProcessWorker',
  STANDARD = 'StandardWorker',
  WEB_SOCKET = 'WebSocketWorker',
  WORKFLOW = 'WorkflowWorker',
  EXECUTION_LOG = 'ExecutionLogWorker',
}

interface IWorkerConfig {
  concurrency: number;
  lockDuration: number;
}

type WorkersConfig = Record<WorkerEnum, IWorkerConfig>;

const getDefaultConcurrency = () =>
  process.env.WORKER_DEFAULT_CONCURRENCY
    ? Number(process.env.WORKER_DEFAULT_CONCURRENCY)
    : undefined;

const getDefaultLockDuration = () =>
  process.env.WORKER_DEFAULT_LOCK_DURATION
    ? Number(process.env.WORKER_DEFAULT_LOCK_DURATION)
    : undefined;

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
    [WorkerEnum.EXECUTION_LOG]: {
      concurrency: getDefaultConcurrency() ?? 200,
      lockDuration: getDefaultLockDuration() ?? 90000,
    },
  };

  return workersConfig[worker];
};

export const getInboundParseMailWorkerOptions = () =>
  getWorkerConfig(WorkerEnum.INBOUND_PARSE_MAIL);

export const getSubscriberProcessWorkerOptions = () =>
  getWorkerConfig(WorkerEnum.SUBSCRIBER_PROCESS);

export const getStandardWorkerOptions = () =>
  getWorkerConfig(WorkerEnum.STANDARD);

export const getWebSocketWorkerOptions = () =>
  getWorkerConfig(WorkerEnum.WEB_SOCKET);

export const getWorkflowWorkerOptions = () =>
  getWorkerConfig(WorkerEnum.WORKFLOW);

export const getExecutionLogWorkerOptions = () =>
  getWorkerConfig(WorkerEnum.EXECUTION_LOG);

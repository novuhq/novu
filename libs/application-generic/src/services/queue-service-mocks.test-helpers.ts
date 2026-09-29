import { PinoLogger } from '../logging';
import { EventBridgeSchedulerService } from './scheduler';
import { SocketWorkerService } from './socket-worker';
import { SqsService } from './sqs';

/*
 * Queue suites only need these collaborators to stay inert - the assertions are
 * on the queue, not on them. They all hold private state, so a structural stub
 * can never be one of them; declaring the stub as `Partial<T>` still checks
 * every method against the real signature and keeps the narrowing assertion in
 * one place instead of repeating it in every suite.
 */

export function createSqsServiceMock(): SqsService {
  const stub: Partial<SqsService> = {
    getQueueUrl: jest.fn(),
    getProducer: jest.fn(),
    getClient: jest.fn(),
    getPayloadOffloadService: jest.fn(),
    isConfigured: jest.fn(() => false),
    send: jest.fn(),
    sendBulk: jest.fn(),
  };

  return stub as SqsService;
}

export function createPinoLoggerMock(): PinoLogger {
  const stub: Partial<PinoLogger> = {
    setContext: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  return stub as PinoLogger;
}

export function createSchedulerServiceMock(): EventBridgeSchedulerService {
  const stub: Partial<EventBridgeSchedulerService> = {
    isConfigured: jest.fn(() => false),
    createDelayedFire: jest.fn(),
    deleteSchedule: jest.fn(),
  };

  return stub as EventBridgeSchedulerService;
}

export function createSocketWorkerServiceMock(): SocketWorkerService {
  const stub: Partial<SocketWorkerService> = {
    isEnabled: jest.fn().mockResolvedValue(false),
    isLegacyWsDisabled: jest.fn().mockResolvedValue(false),
    sendMessage: jest.fn().mockResolvedValue(undefined),
  };

  return stub as SocketWorkerService;
}

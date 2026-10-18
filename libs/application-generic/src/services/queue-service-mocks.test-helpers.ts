import { vi } from 'vitest';
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
    getQueueUrl: vi.fn(),
    getProducer: vi.fn(),
    getClient: vi.fn(),
    getPayloadOffloadService: vi.fn(),
    isConfigured: vi.fn(() => false),
    send: vi.fn(),
    sendBulk: vi.fn(),
  };

  return stub as SqsService;
}

export function createPinoLoggerMock(): PinoLogger {
  const stub: Partial<PinoLogger> = {
    setContext: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return stub as PinoLogger;
}

export function createSchedulerServiceMock(): EventBridgeSchedulerService {
  const stub: Partial<EventBridgeSchedulerService> = {
    isConfigured: vi.fn(() => false),
    createDelayedFire: vi.fn(),
    deleteSchedule: vi.fn(),
  };

  return stub as EventBridgeSchedulerService;
}

export function createSocketWorkerServiceMock(): SocketWorkerService {
  const stub: Partial<SocketWorkerService> = {
    isEnabled: vi.fn().mockResolvedValue(false),
    isLegacyWsDisabled: vi.fn().mockResolvedValue(false),
    sendMessage: vi.fn().mockResolvedValue(undefined),
  };

  return stub as SocketWorkerService;
}

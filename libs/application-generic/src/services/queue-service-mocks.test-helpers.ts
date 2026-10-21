import type { Queue } from 'bullmq';
import { vi } from 'vitest';
import type { PinoLogger } from '../logging';
import type { WorkflowInMemoryProviderService } from './in-memory-provider';
import type { EventBridgeSchedulerService } from './scheduler';
import type { SocketWorkerService } from './socket-worker';
import type { SqsService } from './sqs';

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

/*
 * Hermetic queue suites: bullmq's Queue is replaced so no ioredis client is ever
 * created and nothing talks to Redis. Wire it from a spec with
 *
 *   vi.mock('bullmq', async (importOriginal) =>
 *     (await import('../queue-service-mocks.test-helpers')).mockBullmqModule(await importOriginal()));
 *   const { Queue: QueueMock } = await import('bullmq');
 */
export type MockedQueue = Queue & {
  [K in 'add' | 'addBulk' | 'isPaused' | 'close']: ReturnType<typeof vi.fn>;
};

const createdQueues: MockedQueue[] = [];

export function mockBullmqModule<T extends object>(actual: T): T {
  return {
    ...actual,
    Queue: vi.fn(function MockQueue(name: string) {
      const stub: Partial<Queue> = {
        name,
        add: vi.fn().mockResolvedValue(undefined),
        addBulk: vi.fn().mockResolvedValue(undefined),
        isPaused: vi.fn().mockResolvedValue(false),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const queue = stub as MockedQueue;
      createdQueues.push(queue);

      return queue;
    }),
  };
}

/** The most recently constructed mocked Queue. */
export function getLastQueue(): MockedQueue {
  const queue = createdQueues[createdQueues.length - 1];
  if (!queue) {
    throw new Error('No bullmq Queue has been constructed yet');
  }

  return queue;
}

export function createInMemoryProviderStub(isCluster = false) {
  const client = { stub: 'redis-client' };
  const stub: Partial<WorkflowInMemoryProviderService> = {
    getClient: vi.fn(() => client as never),
    providerInUseIsInClusterMode: vi.fn(() => isCluster),
    isReady: vi.fn(() => true),
  };

  return { provider: stub as WorkflowInMemoryProviderService, client };
}

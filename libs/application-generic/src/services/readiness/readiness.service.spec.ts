import {
  StandardQueueServiceHealthIndicator,
  SubscriberProcessQueueHealthIndicator,
  WorkflowQueueServiceHealthIndicator,
} from '../../health';
import { BullMqService } from '../bull-mq';
import type { WorkflowInMemoryProviderService } from '../in-memory-provider';
import type { StandardQueueService, SubscriberProcessQueueService, WorkflowQueueService } from '../queues';
import { StandardWorkerService, WorkerBaseService } from '../workers';
import { ReadinessService } from './readiness.service';

/*
 * The readiness logic is ours; the BullMQ worker and the queue services behind
 * it would need a live Redis. The worker is replaced with an inert stateful
 * fake and the queue services with stubs that report ready.
 */
vi.mock('bullmq', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bullmq')>();

  class FakeWorker {
    private paused = false;

    constructor(
      public name: string,
      public processor: unknown,
      public opts: Record<string, unknown> = {}
    ) {}

    isPaused = async () => this.paused;
    isRunning = async () => true;
    pause = vi.fn(async () => {
      this.paused = true;
    });
    resume = vi.fn(async () => {
      this.paused = false;
    });
    waitUntilReady = vi.fn(async () => undefined);
    close = vi.fn(async () => undefined);
  }

  return { ...actual, Worker: FakeWorker };
});

let readinessService: ReadinessService;
let testWorker: WorkerBaseService;

const createReadyQueueStub = <T>() => ({ isReady: vi.fn(() => true) }) as unknown as T;

const createProviderStub = () =>
  ({
    providerInUseIsInClusterMode: vi.fn(() => false),
    getClient: vi.fn(() => ({})),
    isReady: vi.fn(() => true),
  }) as unknown as WorkflowInMemoryProviderService;

describe('Readiness Service', () => {
  beforeAll(async () => {
    const standardQueueServiceHealthIndicator = new StandardQueueServiceHealthIndicator(
      createReadyQueueStub<StandardQueueService>()
    );
    const workflowQueueServiceHealthIndicator = new WorkflowQueueServiceHealthIndicator(
      createReadyQueueStub<WorkflowQueueService>()
    );
    const subscriberProcessQueueHealthIndicator = new SubscriberProcessQueueHealthIndicator(
      createReadyQueueStub<SubscriberProcessQueueService>()
    );

    readinessService = new ReadinessService([
      standardQueueServiceHealthIndicator,
      workflowQueueServiceHealthIndicator,
      subscriberProcessQueueHealthIndicator,
    ]);
  });

  afterAll(async () => {
    await testWorker?.gracefulShutdown();
  });

  describe('Set up', () => {
    it('should be able to instantiate it correctly', async () => {
      expect(readinessService['healthIndicators'].map((indicator) => indicator.constructor)).toEqual([
        StandardQueueServiceHealthIndicator,
        WorkflowQueueServiceHealthIndicator,
        SubscriberProcessQueueHealthIndicator,
      ]);

      const areQueuesEnabled = await readinessService.areQueuesEnabled();
      expect(areQueuesEnabled).toEqual(true);
    });
  });

  describe('Functionalities', () => {
    it('should be able to pause the workers given', async () => {
      const getWorkerOptions = () => {
        return {
          lockDuration: 90000,
          concurrency: 200,
        };
      };

      const getWorkerProcessor = () => {
        return async ({ data }) => {
          return await new Promise((resolve) => {
            resolve(data);
          });
        };
      };

      testWorker = new StandardWorkerService(new BullMqService(createProviderStub()));
      await testWorker.initWorker(getWorkerProcessor(), getWorkerOptions());

      const [initialIsPaused, initialIsRunning] = await Promise.all([testWorker.isPaused(), testWorker.isRunning()]);

      expect(initialIsPaused).toEqual(false);
      expect(initialIsRunning).toEqual(true);

      await readinessService.pauseWorkers([testWorker]);

      const [isPaused, isRunning] = await Promise.all([testWorker.isPaused(), testWorker.isRunning()]);

      expect(isPaused).toEqual(true);
      expect(isRunning).toEqual(true);
    });

    it('should be able to resume the workers given', async () => {
      const [initialIsPaused, initialIsRunning] = await Promise.all([testWorker.isPaused(), testWorker.isRunning()]);

      expect(initialIsPaused).toEqual(true);
      expect(initialIsRunning).toEqual(true);

      await readinessService.enableWorkers([testWorker]);

      const [isPaused, isRunning] = await Promise.all([testWorker.isPaused(), testWorker.isRunning()]);

      expect(isPaused).toEqual(false);
      expect(isRunning).toEqual(true);
    });
  });
});

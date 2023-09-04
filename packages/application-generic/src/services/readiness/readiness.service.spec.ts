import { ReadinessService } from './readiness.service';

import { BullMqService } from '../bull-mq';
import { StandardQueueService, WorkflowQueueService } from '../queues';
import { StandardWorkerService, WorkerBaseService } from '../workers';
import {
  StandardQueueServiceHealthIndicator,
  WorkflowQueueServiceHealthIndicator,
} from '../../health';

let readinessService: ReadinessService;
let standardQueueService: StandardQueueService;
let workflowQueueService: WorkflowQueueService;
let testWorker: WorkerBaseService;

describe('Readiness Service', () => {
  beforeAll(async () => {
    process.env.IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

    standardQueueService = new StandardQueueService();
    workflowQueueService = new WorkflowQueueService();

    await Promise.all([
      standardQueueService.bullMqService.initialize(),
      workflowQueueService.bullMqService.initialize(),
    ]);

    const standardQueueServiceHealthIndicator =
      new StandardQueueServiceHealthIndicator(standardQueueService);
    const workflowQueueServiceHealthIndicator =
      new WorkflowQueueServiceHealthIndicator(workflowQueueService);

    readinessService = new ReadinessService(
      standardQueueServiceHealthIndicator,
      workflowQueueServiceHealthIndicator
    );
  });

  afterAll(async () => {
    await standardQueueService.gracefulShutdown();
    await workflowQueueService.gracefulShutdown();
    await testWorker?.gracefulShutdown();
  });

  describe('Set up', () => {
    it('should be able to instantiate it correctly', async () => {
      expect(Object.keys(readinessService)).toEqual(
        expect.arrayContaining([
          'standardQueueServiceHealthIndicator',
          'workflowQueueServiceHealthIndicator',
        ])
      );

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
          return await new Promise(async (resolve, reject) => {
            return resolve(data);
          });
        };
      };

      testWorker = new StandardWorkerService();
      await testWorker.initWorker(getWorkerProcessor(), getWorkerOptions());

      const [initialIsPaused, initialIsRunning] = await Promise.all([
        testWorker.isPaused(),
        testWorker.isRunning(),
      ]);

      expect(initialIsPaused).toEqual(false);
      expect(initialIsRunning).toEqual(true);

      await readinessService.pauseWorkers([testWorker]);

      const [isPaused, isRunning] = await Promise.all([
        testWorker.isPaused(),
        testWorker.isRunning(),
      ]);

      expect(isPaused).toEqual(true);
      expect(isRunning).toEqual(true);
    });

    it('should be able to resume the workers given', async () => {
      const [initialIsPaused, initialIsRunning] = await Promise.all([
        testWorker.isPaused(),
        testWorker.isRunning(),
      ]);

      expect(initialIsPaused).toEqual(true);
      expect(initialIsRunning).toEqual(true);

      await readinessService.enableWorkers([testWorker]);

      const [isPaused, isRunning] = await Promise.all([
        testWorker.isPaused(),
        testWorker.isRunning(),
      ]);

      expect(isPaused).toEqual(false);
      expect(isRunning).toEqual(true);
    });
  });
});

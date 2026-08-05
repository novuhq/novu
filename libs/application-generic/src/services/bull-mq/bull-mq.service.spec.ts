import { JobTopicNameEnum } from '@novu/shared';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { BullMqService, QueueBaseOptions, WorkerOptions } from './bull-mq.service';

let bullMqService: BullMqService;

describe('BullMQ Service', () => {
  describe('Non cluster mode', () => {
    beforeEach(async () => {
      process.env.IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

      bullMqService = new BullMqService(new WorkflowInMemoryProviderService());
    });

    afterEach(async () => {
      await bullMqService.gracefulShutdown();
    });

    describe('Set up', () => {
      it('should be able to instantiate it correctly', async () => {
        expect(bullMqService.queue).toBeUndefined();
        expect(bullMqService.worker).toBeUndefined();
        expect(BullMqService.haveProInstalled()).toBeFalsy();
        expect(await bullMqService.getStatus()).toEqual({
          queueIsPaused: undefined,
          queueName: undefined,
          workerIsPaused: undefined,
          workerIsRunning: undefined,
          workerName: undefined,
        });
      });

      it('should create a queue properly with the default configuration', async () => {
        const queueName = JobTopicNameEnum.ACTIVE_JOBS_METRIC;
        const queueOptions: QueueBaseOptions = {};
        await bullMqService.createQueue(queueName, queueOptions);

        expect(bullMqService.queue.name).toEqual(queueName);

        expect(await bullMqService.getStatus()).toEqual({
          queueIsPaused: false,
          queueName,
          workerIsPaused: undefined,
          workerIsRunning: undefined,
          workerName: undefined,
        });
      });

      it('should create a worker properly with the default configuration', async () => {
        const workerName = JobTopicNameEnum.ACTIVE_JOBS_METRIC;
        await bullMqService.createWorker(workerName, undefined, {});

        expect(bullMqService.worker.name).toEqual(workerName);
      });
    });
  });

  describe('Prefix functionality', () => {
    it('should use prefix if any Cluster provider enabled', async () => {
      process.env.MEMORY_DB_CLUSTER_SERVICE_HOST = 'localhost';
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';

      bullMqService = new BullMqService(new WorkflowInMemoryProviderService());
      const queue = bullMqService.createQueue(JobTopicNameEnum.ACTIVE_JOBS_METRIC, {});
      expect(queue.opts.prefix).toEqual('{metric-active-jobs}');
    });

    it('should not use prefix if a Redis provider is used and not in Cluster mode', async () => {
      process.env.MEMORY_DB_CLUSTER_SERVICE_HOST = '';
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

      bullMqService = new BullMqService(new WorkflowInMemoryProviderService());
      const queue = bullMqService.createQueue(JobTopicNameEnum.ACTIVE_JOBS_METRIC, {});
      expect(queue.opts.prefix).toEqual('bull');
    });

    it('should use prefix if in Cluster mode in Redis', async () => {
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';
      process.env.MEMORY_DB_CLUSTER_SERVICE_HOST = '';

      bullMqService = new BullMqService(new WorkflowInMemoryProviderService());
      const queue = bullMqService.createQueue(JobTopicNameEnum.ACTIVE_JOBS_METRIC, {});
      expect(queue.opts.prefix).toEqual('{metric-active-jobs}');
    });
  });

  describe('Add job', () => {
    beforeEach(() => {
      const mockInMemoryProvider = {
        providerInUseIsInClusterMode: jest.fn(() => false),
      };

      bullMqService = new BullMqService(mockInMemoryProvider as unknown as WorkflowInMemoryProviderService);
    });

    it('should return a Promise<Job> that resolves with the enqueued job', async () => {
      const queue = {
        add: jest.fn().mockResolvedValue({ id: 'job-1' }),
      };
      (bullMqService as any)._queue = queue;

      const result = bullMqService.add('job-name', { test: true } as any);

      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toEqual({ id: 'job-1' });
      expect(queue.add).toHaveBeenCalledTimes(1);
    });

    it('should not resolve before the underlying enqueue settles', async () => {
      let settled = false;
      const queue = {
        add: jest.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                settled = true;
                resolve({ id: 'job-1' });
              }, 50);
            })
        ),
      };
      (bullMqService as any)._queue = queue;

      const result = bullMqService.add('job-name', { test: true } as any);

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(settled).toBe(false);

      await expect(result).resolves.toEqual({ id: 'job-1' });
      expect(settled).toBe(true);
    });

    it('should propagate an enqueue failure to the caller without an unhandled rejection', async () => {
      const enqueueError = new Error('ECONNREFUSED Redis unavailable');
      const unhandledRejections: unknown[] = [];
      const onUnhandledRejection = (reason: unknown) => {
        unhandledRejections.push(reason);
      };
      process.on('unhandledRejection', onUnhandledRejection);

      try {
        const queue = {
          add: jest.fn().mockRejectedValue(enqueueError),
        };
        (bullMqService as any)._queue = queue;

        await expect(bullMqService.add('job-name', { test: true } as any)).rejects.toThrow('ECONNREFUSED');

        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(unhandledRejections).toEqual([]);
      } finally {
        process.removeListener('unhandledRejection', onUnhandledRejection);
      }
    });
  });
});

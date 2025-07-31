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
});

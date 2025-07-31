import { Test } from '@nestjs/testing';
import { BullMqService } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { ActiveJobsMetricQueueService } from './active-jobs-metric-queue.service';

let activeJobsMetricQueueService: ActiveJobsMetricQueueService;

describe('Job metrics Queue service', () => {
  describe('General', () => {
    beforeAll(async () => {
      activeJobsMetricQueueService = new ActiveJobsMetricQueueService(new WorkflowInMemoryProviderService());
      await activeJobsMetricQueueService.queue.drain();
    });

    beforeEach(async () => {
      await activeJobsMetricQueueService.queue.drain();
    });

    afterEach(async () => {
      await activeJobsMetricQueueService.queue.drain();
    });

    afterAll(async () => {
      await activeJobsMetricQueueService.gracefulShutdown();
    });

    it('should be initialised properly', async () => {
      expect(activeJobsMetricQueueService).toBeDefined();
      expect(Object.keys(activeJobsMetricQueueService)).toEqual(
        expect.arrayContaining(['topic', 'DEFAULT_ATTEMPTS', 'instance', 'queue'])
      );
      expect(activeJobsMetricQueueService.DEFAULT_ATTEMPTS).toEqual(3);
      expect(activeJobsMetricQueueService.topic).toEqual('metric-active-jobs');
      expect(await activeJobsMetricQueueService.getStatus()).toEqual({
        queueIsPaused: false,
        queueName: 'metric-active-jobs',
        workerName: undefined,
        workerIsPaused: undefined,
        workerIsRunning: undefined,
      });
      expect(await activeJobsMetricQueueService.isPaused()).toEqual(false);
      expect(activeJobsMetricQueueService.queue).toMatchObject(
        expect.objectContaining({
          _events: {},
          _eventsCount: 0,
          _maxListeners: undefined,
          name: 'metric-active-jobs',
          jobsOpts: {
            removeOnComplete: true,
          },
        })
      );
      expect(activeJobsMetricQueueService.queue.opts.prefix).toEqual('bull');
    });
  });

  describe('Cluster mode', () => {
    beforeAll(async () => {
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';

      activeJobsMetricQueueService = new ActiveJobsMetricQueueService(new WorkflowInMemoryProviderService());
      await activeJobsMetricQueueService.queue.obliterate();
    });

    afterAll(async () => {
      await activeJobsMetricQueueService.gracefulShutdown();
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    });

    it('should have prefix in cluster mode', async () => {
      expect(activeJobsMetricQueueService.queue.opts.prefix).toEqual('{metric-active-jobs}');
    });
  });
});

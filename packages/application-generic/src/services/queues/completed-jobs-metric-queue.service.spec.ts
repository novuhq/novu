import { Test } from '@nestjs/testing';

import { CompletedJobsMetricQueueService } from './completed-jobs-metric-queue.service';

let completedJobsMetricQueueService: CompletedJobsMetricQueueService;

describe('Job metrics Queue service', () => {
  describe('General', () => {
    beforeAll(async () => {
      completedJobsMetricQueueService = new CompletedJobsMetricQueueService();
      await completedJobsMetricQueueService.queue.drain();
    });

    beforeEach(async () => {
      await completedJobsMetricQueueService.queue.drain();
    });

    afterEach(async () => {
      await completedJobsMetricQueueService.queue.drain();
    });

    afterAll(async () => {
      await completedJobsMetricQueueService.gracefulShutdown();
    });

    it('should be initialised properly', async () => {
      expect(completedJobsMetricQueueService).toBeDefined();
      expect(Object.keys(completedJobsMetricQueueService)).toEqual(
        expect.arrayContaining([
          'topic',
          'DEFAULT_ATTEMPTS',
          'instance',
          'queue',
        ])
      );
      expect(completedJobsMetricQueueService.DEFAULT_ATTEMPTS).toEqual(3);
      expect(completedJobsMetricQueueService.topic).toEqual(
        'metric-completed-jobs'
      );
      expect(
        await completedJobsMetricQueueService.bullMqService.getStatus()
      ).toEqual({
        queueIsPaused: false,
        queueName: 'metric-completed-jobs',
        workerName: undefined,
        workerIsPaused: undefined,
        workerIsRunning: undefined,
      });
      expect(await completedJobsMetricQueueService.isPaused()).toEqual(false);
      expect(completedJobsMetricQueueService.queue).toMatchObject(
        expect.objectContaining({
          _events: {},
          _eventsCount: 0,
          _maxListeners: undefined,
          name: 'metric-completed-jobs',
          jobsOpts: {
            removeOnComplete: true,
          },
        })
      );
      expect(completedJobsMetricQueueService.queue.opts.prefix).toEqual('bull');
    });
  });

  describe('Cluster mode', () => {
    beforeAll(async () => {
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';

      completedJobsMetricQueueService = new CompletedJobsMetricQueueService();
      await completedJobsMetricQueueService.queue.obliterate();
    });

    afterAll(async () => {
      await completedJobsMetricQueueService.gracefulShutdown();
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    });

    it('should have prefix in cluster mode', async () => {
      expect(completedJobsMetricQueueService.queue.opts.prefix).toEqual(
        '{metric-completed-jobs}'
      );
    });
  });
});

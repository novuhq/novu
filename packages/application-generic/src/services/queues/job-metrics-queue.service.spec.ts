import { Test } from '@nestjs/testing';

import { JobMetricsQueueService } from './job-metrics-queue.service';

let jobMetricsQueueService: JobMetricsQueueService;

describe('Job metrics Queue service', () => {
  describe('General', () => {
    beforeAll(async () => {
      jobMetricsQueueService = new JobMetricsQueueService();
      await jobMetricsQueueService.queue.drain();
    });

    beforeEach(async () => {
      await jobMetricsQueueService.queue.drain();
    });

    afterEach(async () => {
      await jobMetricsQueueService.queue.drain();
    });

    afterAll(async () => {
      await jobMetricsQueueService.gracefulShutdown();
    });

    it('should be initialised properly', async () => {
      expect(jobMetricsQueueService).toBeDefined();
      expect(Object.keys(jobMetricsQueueService)).toEqual(
        expect.arrayContaining([
          'topic',
          'DEFAULT_ATTEMPTS',
          'instance',
          'queue',
        ])
      );
      expect(jobMetricsQueueService.DEFAULT_ATTEMPTS).toEqual(3);
      expect(jobMetricsQueueService.topic).toEqual('metric');
      expect(await jobMetricsQueueService.bullMqService.getStatus()).toEqual({
        queueIsPaused: false,
        queueName: 'metric',
        workerName: undefined,
        workerIsPaused: undefined,
        workerIsRunning: undefined,
      });
      expect(await jobMetricsQueueService.isPaused()).toEqual(true);
      expect(jobMetricsQueueService.queue).toMatchObject(
        expect.objectContaining({
          _events: {},
          _eventsCount: 0,
          _maxListeners: undefined,
          name: 'metric',
          jobsOpts: {
            removeOnComplete: true,
          },
        })
      );
      expect(jobMetricsQueueService.queue.opts.prefix).toEqual('bull');
    });
  });

  describe('Cluster mode', () => {
    beforeAll(async () => {
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';

      jobMetricsQueueService = new JobMetricsQueueService();
      await jobMetricsQueueService.queue.obliterate();
    });

    afterAll(async () => {
      await jobMetricsQueueService.gracefulShutdown();
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    });

    it('should have prefix in cluster mode', async () => {
      expect(jobMetricsQueueService.queue.opts.prefix).toEqual('{metric}');
    });
  });
});

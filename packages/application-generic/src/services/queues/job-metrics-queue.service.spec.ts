import { Test } from '@nestjs/testing';

import { JobMetricsQueueService } from './job-metrics-queue.service';

let jobMetricsQueueService: JobMetricsQueueService;

describe('Job metrics Queue service', () => {
  beforeAll(async () => {
    jobMetricsQueueService = new JobMetricsQueueService();
    await jobMetricsQueueService.queue.obliterate();
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
      expect.arrayContaining(['topic', 'DEFAULT_ATTEMPTS', 'instance', 'queue'])
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
    expect(await jobMetricsQueueService.isPaused()).toEqual(false);
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
    expect(jobMetricsQueueService.queue.opts).toMatchObject(
      expect.objectContaining({
        blockingConnection: false,
        connection: {
          connectTimeout: 50000,
          db: 1,
          family: 4,
          host: 'localhost',
          keepAlive: 7200,
          keyPrefix: '',
          password: undefined,
          port: 6379,
          tls: undefined,
          username: undefined,
        },
        defaultJobOptions: {
          removeOnComplete: true,
        },
        prefix: '{metric}',
        sharedConnection: false,
      })
    );
    expect(jobMetricsQueueService.queue.opts.connection).toMatchObject(
      expect.objectContaining({
        host: 'localhost',
        port: 6379,
      })
    );
  });

  it('should add a job in the queue', async () => {
    const jobId = 'job-metrics-job-id';
    const _environmentId = 'job-metrics-environment-id';
    const _organizationId = 'job-metrics-organization-id';
    const _userId = 'job-metrics-user-id';
    const jobData = {
      _id: jobId,
      test: 'job-metrics-job-data',
      _environmentId,
      _organizationId,
      _userId,
    };
    await jobMetricsQueueService.add(jobId, jobData, _organizationId);

    expect(await jobMetricsQueueService.queue.getActiveCount()).toEqual(0);
    expect(await jobMetricsQueueService.queue.getWaitingCount()).toEqual(1);

    const jobMetricsQueueJobs = await jobMetricsQueueService.queue.getJobs();
    expect(jobMetricsQueueJobs.length).toEqual(1);
    const [jobMetricsQueueJob] = jobMetricsQueueJobs;
    expect(jobMetricsQueueJob).toMatchObject(
      expect.objectContaining({
        id: '1',
        name: jobId,
        data: jobData,
        attemptsMade: 0,
      })
    );
  });

  it('should add a minimal job in the queue', async () => {
    const jobId = 'job-metrics-job-id-2';
    const _environmentId = 'job-metrics-environment-id';
    const _organizationId = 'job-metrics-organization-id';
    const _userId = 'job-metrics-user-id';
    const jobData = {
      _id: jobId,
      test: 'job-metrics-job-data-2',
      _environmentId,
      _organizationId,
      _userId,
    };
    await jobMetricsQueueService.addMinimalJob(jobId, jobData, _organizationId);

    expect(await jobMetricsQueueService.queue.getActiveCount()).toEqual(0);
    expect(await jobMetricsQueueService.queue.getWaitingCount()).toEqual(1);

    const jobMetricsQueueJobs = await jobMetricsQueueService.queue.getJobs();
    expect(jobMetricsQueueJobs.length).toEqual(1);
    const [jobMetricsQueueJob] = jobMetricsQueueJobs;
    expect(jobMetricsQueueJob).toMatchObject(
      expect.objectContaining({
        id: '2',
        name: jobId,
        data: {
          _id: jobId,
          _environmentId,
          _organizationId,
          _userId,
        },
        attemptsMade: 0,
      })
    );
  });
});

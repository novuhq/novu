import { Test } from '@nestjs/testing';

import { QueueService } from './queue.service';

let queueService: QueueService;

describe('Queue service', () => {
  beforeEach(async () => {
    queueService = new QueueService();
    await queueService.bullMqService.queue.obliterate();
  });

  afterEach(async () => {
    await queueService.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(queueService).toBeDefined();
    expect(Object.keys(queueService)).toEqual([
      'name',
      'DEFAULT_ATTEMPTS',
      'bullMqService',
    ]);
    expect(queueService.name).toEqual('standard');
    expect(await queueService.bullMqService.getRunningStatus()).toStrictEqual({
      queueIsPaused: false,
      queueName: 'standard',
      workerName: undefined,
      workerIsRunning: undefined,
    });
    expect(queueService.DEFAULT_ATTEMPTS).toEqual(3);
    expect(queueService.bullMqService.queue).toMatchObject({
      _events: {},
      _eventsCount: 0,
      _maxListeners: undefined,
      name: 'standard',
      jobsOpts: {
        removeOnComplete: true,
      },
    });
    expect(queueService.bullMqService.queue.opts).toMatchObject({
      blockingConnection: false,
      connection: {
        connectTimeout: 50000,
        db: 1,
        family: 4,
        host: 'localhost',
        keepAlive: 30000,
        keyPrefix: '',
        password: undefined,
        port: 6379,
        tls: undefined,
      },
      defaultJobOptions: {
        removeOnComplete: true,
      },
      prefix: 'bull',
      sharedConnection: false,
    });
    expect(queueService.bullMqService.queue.opts.connection).toMatchObject({
      host: 'localhost',
      port: 6379,
    });
  });

  it('should add a job in the queue', async () => {
    const jobId = 'queue-job-id';
    const _environmentId = 'queue-environment-id';
    const _organizationId = 'queue-organization-id';
    const _userId = 'queue-user-id';
    const jobData = {
      _id: jobId,
      test: 'queue-job-data',
      _environmentId,
      _organizationId,
      _userId,
    };
    await queueService.addToQueue(jobId, jobData);

    expect(await queueService.bullMqService.queue.getActiveCount()).toEqual(0);
    expect(await queueService.bullMqService.queue.getWaitingCount()).toEqual(1);

    const queueJobs = await queueService.bullMqService.queue.getJobs();
    expect(queueJobs.length).toEqual(1);
    const [queueJob] = queueJobs;
    expect(queueJob).toMatchObject(
      expect.objectContaining({
        id: '1',
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

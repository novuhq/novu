import { Test } from '@nestjs/testing';

import { TriggerQueueService } from './trigger-queue.service';

let triggerQueueService: TriggerQueueService;

describe('TriggerQueue service', () => {
  beforeEach(async () => {
    triggerQueueService = new TriggerQueueService();
    await triggerQueueService.bullMqService.queue.obliterate();
  });

  afterEach(async () => {
    await triggerQueueService.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(triggerQueueService).toBeDefined();
    expect(Object.keys(triggerQueueService)).toEqual(['name', 'bullMqService']);
    expect(triggerQueueService.name).toEqual('trigger-handler');
    expect(
      await triggerQueueService.bullMqService.getRunningStatus()
    ).toStrictEqual({
      queueIsPaused: false,
      queueName: 'trigger-handler',
      workerName: undefined,
      workerIsRunning: undefined,
    });
    expect(triggerQueueService.bullMqService.queue).toMatchObject({
      _events: {},
      _eventsCount: 0,
      _maxListeners: undefined,
      name: 'trigger-handler',
      jobsOpts: {
        removeOnComplete: true,
      },
    });
    expect(triggerQueueService.bullMqService.queue.opts).toMatchObject({
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
    expect(
      triggerQueueService.bullMqService.queue.opts.connection
    ).toMatchObject({
      host: 'localhost',
      port: 6379,
    });
  });

  it('should add a job in the queue', async () => {
    const jobId = 'trigger-queue-job-id';
    const organizationId = 'trigger-queue-organization-id';
    const jobData = {
      test: 'trigger-queue-job-data',
    };
    await triggerQueueService.add(jobId, jobData, organizationId);

    expect(
      await triggerQueueService.bullMqService.queue.getActiveCount()
    ).toEqual(0);
    expect(
      await triggerQueueService.bullMqService.queue.getWaitingCount()
    ).toEqual(1);

    const triggerQueueJobs =
      await triggerQueueService.bullMqService.queue.getJobs();
    expect(triggerQueueJobs.length).toEqual(1);
    const [triggerQueueJob] = triggerQueueJobs;
    expect(triggerQueueJob).toMatchObject({
      id: '1',
      name: jobId,
      data: jobData,
      attemptsMade: 0,
    });
  });
});

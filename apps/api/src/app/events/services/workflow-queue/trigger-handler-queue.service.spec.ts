import { Test } from '@nestjs/testing';
import { expect } from 'chai';

import { TriggerHandlerQueueService } from './trigger-handler-queue.service';

let triggerHandlerQueueService: TriggerHandlerQueueService;

describe('TriggerHandlerQueue service', () => {
  beforeEach(async () => {
    triggerHandlerQueueService = new TriggerHandlerQueueService();
    await triggerHandlerQueueService.bullMqService.queue.obliterate();
  });

  afterEach(async () => {
    await triggerHandlerQueueService.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(triggerHandlerQueueService).to.exist;
    expect(Object.keys(triggerHandlerQueueService)).to.include.members(['name', 'bullMqService']);
    expect(triggerHandlerQueueService.name).to.equal('trigger-handler');
    expect(await triggerHandlerQueueService.bullMqService.getRunningStatus()).to.deep.equal({
      queueIsPaused: false,
      queueName: 'trigger-handler',
      workerName: undefined,
      workerIsRunning: undefined,
    });
    expect(triggerHandlerQueueService.bullMqService.queue).to.deep.include({
      _events: {},
      _eventsCount: 0,
      _maxListeners: undefined,
      name: 'trigger-handler',
      jobsOpts: {
        removeOnComplete: true,
      },
    });
    expect(triggerHandlerQueueService.bullMqService.queue.opts).to.deep.include({
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
    expect(triggerHandlerQueueService.bullMqService.queue.opts.connection).to.deep.include({
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
    await triggerHandlerQueueService.add(jobId, jobData, organizationId);

    expect(await triggerHandlerQueueService.bullMqService.queue.getActiveCount()).to.equal(0);
    expect(await triggerHandlerQueueService.bullMqService.queue.getWaitingCount()).to.equal(1);

    const triggerHandlerQueueJobs = await triggerHandlerQueueService.bullMqService.queue.getJobs();
    expect(triggerHandlerQueueJobs.length).to.equal(1);
    const [triggerHandlerQueueJob] = triggerHandlerQueueJobs;
    expect(triggerHandlerQueueJob).to.deep.include({
      id: '1',
      name: jobId,
      data: jobData,
      attemptsMade: 0,
    });
  });
});

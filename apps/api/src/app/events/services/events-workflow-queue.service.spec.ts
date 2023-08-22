import { Test } from '@nestjs/testing';
import { expect } from 'chai';

import { EventsWorkflowQueueService } from './events-workflow-queue.service';

let eventsWorkflowQueueService: EventsWorkflowQueueService;

describe('EventsWorkflowQueue service', () => {
  beforeEach(async () => {
    eventsWorkflowQueueService = new EventsWorkflowQueueService();
    await eventsWorkflowQueueService.queue.obliterate();
  });

  after(async () => {
    await eventsWorkflowQueueService.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(eventsWorkflowQueueService).to.exist;
    expect(Object.keys(eventsWorkflowQueueService)).to.include.members([
      'topic',
      'queue',
      'DEFAULT_ATTEMPTS',
      'instance',
    ]);
    expect(eventsWorkflowQueueService.topic).to.equal('trigger-handler');
    expect(await eventsWorkflowQueueService.bullMqService.getStatus()).to.deep.equal({
      queueIsPaused: false,
      queueName: 'trigger-handler',
      workerName: undefined,
      workerIsPaused: undefined,
      workerIsRunning: undefined,
    });
    expect(eventsWorkflowQueueService.queue).to.deep.include({
      _events: {},
      _eventsCount: 0,
      _maxListeners: undefined,
      name: 'trigger-handler',
      jobsOpts: {
        removeOnComplete: true,
      },
    });
    expect(eventsWorkflowQueueService.queue.opts).to.deep.include({
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
      prefix: '{trigger-handler}',
      sharedConnection: false,
    });
    expect(eventsWorkflowQueueService.queue.opts.connection).to.deep.include({
      host: 'localhost',
      port: 6379,
    });
  });

  it('should add a job in the queue', async () => {
    const jobId = 'events-workflow-job-id';
    const _environmentId = 'events-workflow-environment-id';
    const _organizationId = 'events-workflow-organization-id';
    const _userId = 'events-workflow-user-id';
    const jobData = {
      _id: jobId,
      test: 'events-workflow-job-data',
      _environmentId,
      _organizationId,
      _userId,
    };
    await eventsWorkflowQueueService.add(jobId, jobData, _organizationId);

    expect(await eventsWorkflowQueueService.queue.getActiveCount()).to.equal(0);
    expect(await eventsWorkflowQueueService.queue.getWaitingCount()).to.equal(1);

    const eventsWorkflowQueueJobs = await eventsWorkflowQueueService.queue.getJobs();
    expect(eventsWorkflowQueueJobs.length).to.equal(1);
    const [eventsWorkflowQueueJob] = eventsWorkflowQueueJobs;
    expect(eventsWorkflowQueueJob).to.deep.include({
      id: '1',
      name: jobId,
      data: jobData,
      attemptsMade: 0,
    });
  });
});

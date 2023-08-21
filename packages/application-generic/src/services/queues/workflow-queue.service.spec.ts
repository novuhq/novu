import { Test } from '@nestjs/testing';

import { WorkflowQueueService } from './workflow-queue.service';

let workflowQueueService: WorkflowQueueService;

describe('Workflow Queue service', () => {
  beforeAll(async () => {
    workflowQueueService = new WorkflowQueueService();
    await workflowQueueService.queue.obliterate();
  });

  beforeEach(async () => {
    await workflowQueueService.queue.drain();
  });

  afterAll(async () => {
    await workflowQueueService.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(workflowQueueService).toBeDefined();
    expect(Object.keys(workflowQueueService)).toEqual(
      expect.arrayContaining(['topic', 'DEFAULT_ATTEMPTS', 'instance', 'queue'])
    );
    expect(workflowQueueService.DEFAULT_ATTEMPTS).toEqual(3);
    expect(workflowQueueService.topic).toEqual('trigger-handler');
    expect(await workflowQueueService.bullMqService.getRunningStatus()).toEqual(
      {
        queueIsPaused: false,
        queueName: 'trigger-handler',
        workerName: undefined,
        workerIsRunning: undefined,
      }
    );
    expect(workflowQueueService.queue).toMatchObject(
      expect.objectContaining({
        _events: {},
        _eventsCount: 0,
        _maxListeners: undefined,
        name: 'trigger-handler',
        jobsOpts: {
          removeOnComplete: true,
        },
      })
    );
    expect(workflowQueueService.queue.opts).toMatchObject(
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
        prefix: '{trigger-handler}',
        sharedConnection: false,
      })
    );
    expect(workflowQueueService.queue.opts.connection).toMatchObject(
      expect.objectContaining({
        host: 'localhost',
        port: 6379,
      })
    );
  });

  it('should add a job in the queue', async () => {
    const jobId = 'workflow-job-id';
    const _environmentId = 'workflow-environment-id';
    const _organizationId = 'workflow-organization-id';
    const _userId = 'workflow-user-id';
    const jobData = {
      _id: jobId,
      test: 'workflow-job-data',
      _environmentId,
      _organizationId,
      _userId,
    };
    await workflowQueueService.add(jobId, jobData, _organizationId);

    expect(await workflowQueueService.queue.getActiveCount()).toEqual(0);
    expect(await workflowQueueService.queue.getWaitingCount()).toEqual(1);

    const workflowQueueJobs = await workflowQueueService.queue.getJobs();
    expect(workflowQueueJobs.length).toEqual(1);
    const [workflowQueueJob] = workflowQueueJobs;
    expect(workflowQueueJob).toMatchObject(
      expect.objectContaining({
        id: '1',
        name: jobId,
        data: jobData,
        attemptsMade: 0,
      })
    );
  });

  it('should add a minimal job in the queue', async () => {
    const jobId = 'workflow-job-id-2';
    const _environmentId = 'workflow-environment-id';
    const _organizationId = 'workflow-organization-id';
    const _userId = 'workflow-user-id';
    const jobData = {
      _id: jobId,
      test: 'workflow-job-data-2',
      _environmentId,
      _organizationId,
      _userId,
    };
    await workflowQueueService.addMinimalJob(jobId, jobData, _organizationId);

    expect(await workflowQueueService.queue.getActiveCount()).toEqual(0);
    expect(await workflowQueueService.queue.getWaitingCount()).toEqual(1);

    const workflowQueueJobs = await workflowQueueService.queue.getJobs();
    expect(workflowQueueJobs.length).toEqual(1);
    const [workflowQueueJob] = workflowQueueJobs;
    expect(workflowQueueJob).toMatchObject(
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

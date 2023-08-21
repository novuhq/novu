import { Test } from '@nestjs/testing';

import { WebSocketsQueueService } from './web-sockets-queue.service';

let webSocketsQueueService: WebSocketsQueueService;

describe('WebSockets Queue service', () => {
  beforeAll(async () => {
    webSocketsQueueService = new WebSocketsQueueService();
    await webSocketsQueueService.queue.obliterate();
  });

  beforeEach(async () => {
    await webSocketsQueueService.queue.drain();
  });

  afterAll(async () => {
    await webSocketsQueueService.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(webSocketsQueueService).toBeDefined();
    expect(Object.keys(webSocketsQueueService)).toEqual(
      expect.arrayContaining(['topic', 'DEFAULT_ATTEMPTS', 'instance', 'queue'])
    );
    expect(webSocketsQueueService.DEFAULT_ATTEMPTS).toEqual(3);
    expect(webSocketsQueueService.topic).toEqual('ws_socket_queue');
    expect(
      await webSocketsQueueService.bullMqService.getRunningStatus()
    ).toEqual({
      queueIsPaused: false,
      queueName: 'ws_socket_queue',
      workerName: undefined,
      workerIsRunning: undefined,
    });
    expect(webSocketsQueueService.queue).toMatchObject(
      expect.objectContaining({
        _events: {},
        _eventsCount: 0,
        _maxListeners: undefined,
        name: 'ws_socket_queue',
        jobsOpts: {
          removeOnComplete: true,
        },
      })
    );
    expect(webSocketsQueueService.queue.opts).toMatchObject(
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
        prefix: '{ws_socket_queue}',
        sharedConnection: false,
      })
    );
    expect(webSocketsQueueService.queue.opts.connection).toMatchObject(
      expect.objectContaining({
        host: 'localhost',
        port: 6379,
      })
    );
  });

  it('should add a job in the queue', async () => {
    const jobId = 'web-sockets-queue-job-id';
    const _environmentId = 'web-sockets-queue-environment-id';
    const _organizationId = 'web-sockets-queue-organization-id';
    const _userId = 'web-sockets-queue-user-id';
    const jobData = {
      _id: jobId,
      test: 'web-sockets-queue-job-data',
      _environmentId,
      _organizationId,
      _userId,
    };
    await webSocketsQueueService.add(jobId, jobData, _organizationId);

    expect(await webSocketsQueueService.queue.getActiveCount()).toEqual(0);
    expect(await webSocketsQueueService.queue.getWaitingCount()).toEqual(1);

    const webSocketsQueueJobs = await webSocketsQueueService.queue.getJobs();
    expect(webSocketsQueueJobs.length).toEqual(1);
    const [webSocketsQueueJob] = webSocketsQueueJobs;
    expect(webSocketsQueueJob).toMatchObject(
      expect.objectContaining({
        id: '1',
        name: jobId,
        data: jobData,
        attemptsMade: 0,
      })
    );
  });

  it('should add a minimal job in the queue', async () => {
    const jobId = 'web-sockets-queue-job-id-2';
    const _environmentId = 'web-sockets-queue-environment-id';
    const _organizationId = 'web-sockets-queue-organization-id';
    const _userId = 'web-sockets-queue-user-id';
    const jobData = {
      _id: jobId,
      test: 'web-sockets-queue-job-data-2',
      _environmentId,
      _organizationId,
      _userId,
    };
    await webSocketsQueueService.addMinimalJob(jobId, jobData, _organizationId);

    expect(await webSocketsQueueService.queue.getActiveCount()).toEqual(0);
    expect(await webSocketsQueueService.queue.getWaitingCount()).toEqual(1);

    const webSocketsQueueJobs = await webSocketsQueueService.queue.getJobs();
    expect(webSocketsQueueJobs.length).toEqual(1);
    const [webSocketQueueJob] = webSocketsQueueJobs;
    expect(webSocketQueueJob).toMatchObject(
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

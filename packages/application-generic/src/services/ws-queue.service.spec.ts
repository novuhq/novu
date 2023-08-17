import { Test } from '@nestjs/testing';

import { WsQueueService } from './ws-queue.service';

let wsQueueService: WsQueueService;

describe('WebSocket Queue service', () => {
  beforeEach(async () => {
    wsQueueService = new WsQueueService();
    await wsQueueService.bullMqService.queue.obliterate();
  });

  afterEach(async () => {
    await wsQueueService.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(wsQueueService).toBeDefined();
    expect(Object.keys(wsQueueService)).toEqual([
      'name',
      'DEFAULT_ATTEMPTS',
      'bullMqService',
    ]);
    expect(wsQueueService.DEFAULT_ATTEMPTS).toEqual(3);
    expect(wsQueueService.name).toEqual('ws_socket_queue');
    expect(await wsQueueService.getJobStats('ws_socket_queue')).toMatchObject({
      active: 0,
    });
    expect(await wsQueueService.bullMqService.getRunningStatus()).toStrictEqual(
      {
        queueIsPaused: false,
        queueName: 'ws_socket_queue',
        workerName: undefined,
        workerIsRunning: undefined,
      }
    );
    expect(wsQueueService.bullMqService.queue).toMatchObject({
      _events: {},
      _eventsCount: 0,
      _maxListeners: undefined,
      name: 'ws_socket_queue',
      jobsOpts: {
        removeOnComplete: true,
      },
    });
    expect(wsQueueService.bullMqService.queue.opts).toMatchObject({
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
    expect(wsQueueService.bullMqService.queue.opts.connection).toMatchObject({
      host: 'localhost',
      port: 6379,
    });
  });

  it('should add a job in the queue', async () => {
    const jobId = 'ws-queue-job-id';
    const _environmentId = 'ws-queue-environment-id';
    const _organizationId = 'ws-queue-organization-id';
    const _userId = 'ws-queue-user-id';
    const jobData = {
      _id: jobId,
      test: 'ws-queue-job-data',
      _environmentId,
      _organizationId,
      _userId,
    };
    await wsQueueService.addToQueue(jobId, jobData);

    expect(await wsQueueService.getJobStats('ws_socket_queue')).toStrictEqual({
      active: 0,
      waiting: 1,
    });

    const wsQueueJobs = await wsQueueService.bullMqService.queue.getJobs();
    expect(wsQueueJobs.length).toEqual(1);
    const [wsQueueJob] = wsQueueJobs;
    expect(wsQueueJob).toMatchObject({
      id: '1',
      name: jobId,
      data: {
        _id: jobId,
        _environmentId,
        _organizationId,
        _userId,
      },
      attemptsMade: 0,
    });
  });
});

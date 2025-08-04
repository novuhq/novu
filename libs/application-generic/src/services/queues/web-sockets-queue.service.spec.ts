import { Test } from '@nestjs/testing';
import { IWebSocketJobDto } from '../../dtos';
import { BullMqService } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { SocketWorkerService } from '../socket-worker';
import { WebSocketsQueueService } from './web-sockets-queue.service';

let webSocketsQueueService: WebSocketsQueueService;

// Mock SocketWorkerService
const mockSocketWorkerService = {
  isEnabled: jest.fn().mockResolvedValue(false),
  sendMessage: jest.fn().mockResolvedValue(undefined),
} as any;

describe('WebSockets Queue service', () => {
  describe('General', () => {
    beforeAll(async () => {
      webSocketsQueueService = new WebSocketsQueueService(
        new WorkflowInMemoryProviderService(),
        mockSocketWorkerService
      );
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
      expect(await webSocketsQueueService.getStatus()).toEqual({
        queueIsPaused: false,
        queueName: 'ws_socket_queue',
        workerName: undefined,
        workerIsPaused: undefined,
        workerIsRunning: undefined,
      });
      expect(await webSocketsQueueService.isPaused()).toEqual(false);
      expect(webSocketsQueueService.queue.opts.prefix).toEqual('bull');
    });

    it('should add a job in the queue', async () => {
      const jobId = 'web-sockets-queue-job-id';
      const _environmentId = 'web-sockets-queue-environment-id';
      const _organizationId = 'web-sockets-queue-organization-id';
      const _userId = 'web-sockets-queue-user-id';
      const jobData = {
        _id: jobId,
        _environmentId,
        _organizationId,
        _userId,
      } as any;

      await webSocketsQueueService.add({
        name: jobId,
        data: jobData,
        groupId: _organizationId,
      });

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

      await webSocketsQueueService.add({
        name: jobId,
        data: jobData as any,
        groupId: _organizationId,
      });

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

  describe('Cluster mode', () => {
    beforeAll(async () => {
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';

      webSocketsQueueService = new WebSocketsQueueService(
        new WorkflowInMemoryProviderService(),
        mockSocketWorkerService
      );
      await webSocketsQueueService.queue.obliterate();
    });

    afterAll(async () => {
      await webSocketsQueueService.gracefulShutdown();
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    });

    it('should have prefix in cluster mode', async () => {
      expect(webSocketsQueueService.queue.opts.prefix).toEqual('{ws_socket_queue}');
    });
  });
});

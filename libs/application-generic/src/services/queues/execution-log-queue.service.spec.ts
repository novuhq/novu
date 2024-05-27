import { Test } from '@nestjs/testing';

import { ExecutionLogQueueService } from './execution-log-queue.service';
import { BullMqService } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';

let executionLogQueueService: ExecutionLogQueueService;

describe('Execution Log Queue service', () => {
  describe('General', () => {
    beforeAll(async () => {
      executionLogQueueService = new ExecutionLogQueueService(
        new WorkflowInMemoryProviderService()
      );
      await executionLogQueueService.queue.drain();
    });

    beforeEach(async () => {
      await executionLogQueueService.queue.drain();
    });

    afterEach(async () => {
      await executionLogQueueService.queue.drain();
    });

    afterAll(async () => {
      await executionLogQueueService.gracefulShutdown();
    });

    it('should be initialised properly', async () => {
      expect(executionLogQueueService).toBeDefined();
      expect(Object.keys(executionLogQueueService)).toEqual(
        expect.arrayContaining([
          'topic',
          'DEFAULT_ATTEMPTS',
          'instance',
          'queue',
        ])
      );
      expect(executionLogQueueService.DEFAULT_ATTEMPTS).toEqual(3);
      expect(executionLogQueueService.topic).toEqual('execution-logs');
      expect(await executionLogQueueService.getStatus()).toEqual({
        queueIsPaused: false,
        queueName: 'execution-logs',
        workerName: undefined,
        workerIsPaused: undefined,
        workerIsRunning: undefined,
      });
      expect(await executionLogQueueService.isPaused()).toEqual(false);
      expect(executionLogQueueService.queue).toMatchObject(
        expect.objectContaining({
          _events: {},
          _eventsCount: 0,
          _maxListeners: undefined,
          name: 'execution-logs',
          jobsOpts: {
            removeOnComplete: true,
          },
        })
      );
      expect(executionLogQueueService.queue.opts.prefix).toEqual('bull');
    });
  });

  describe('Cluster mode', () => {
    beforeAll(async () => {
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';

      executionLogQueueService = new ExecutionLogQueueService(
        new WorkflowInMemoryProviderService()
      );
      await executionLogQueueService.queue.obliterate();
    });

    afterAll(async () => {
      await executionLogQueueService.gracefulShutdown();
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    });

    it('should have prefix in cluster mode', async () => {
      expect(executionLogQueueService.queue.opts.prefix).toEqual(
        '{execution-logs}'
      );
    });
  });
});

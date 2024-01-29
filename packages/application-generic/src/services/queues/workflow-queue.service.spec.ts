import { Test } from '@nestjs/testing';

import { WorkflowQueueService } from './workflow-queue.service';
import { BullMqService } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { IWorkflowDataDto } from '../../dtos';

let workflowQueueService: WorkflowQueueService;

describe('Workflow Queue service', () => {
  describe('General', () => {
    beforeAll(async () => {
      workflowQueueService = new WorkflowQueueService(
        new WorkflowInMemoryProviderService()
      );
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
        expect.arrayContaining([
          'topic',
          'DEFAULT_ATTEMPTS',
          'instance',
          'queue',
        ])
      );
      expect(workflowQueueService.DEFAULT_ATTEMPTS).toEqual(3);
      expect(workflowQueueService.topic).toEqual('trigger-handler');
      expect(await workflowQueueService.getStatus()).toEqual({
        queueIsPaused: false,
        queueName: 'trigger-handler',
        workerName: undefined,
        workerIsPaused: undefined,
        workerIsRunning: undefined,
      });
      expect(await workflowQueueService.isPaused()).toEqual(false);
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
      expect(workflowQueueService.queue.opts.prefix).toEqual('bull');
    });

    it('should add a job in the queue', async () => {
      const jobId = 'workflow-job-id';
      const _environmentId = 'workflow-environment-id';
      const _organizationId = 'workflow-organization-id';
      const _userId = 'workflow-user-id';
      const jobData = {
        _id: jobId,
        _environmentId,
        _organizationId,
        _userId,
      } as unknown as IWorkflowDataDto;

      await workflowQueueService.add({
        name: jobId,
        data: jobData,
        groupId: _organizationId,
      });

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

      await workflowQueueService.add({
        name: jobId,
        data: jobData as any,
        groupId: _organizationId,
      });

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

  describe('Cluster mode', () => {
    beforeAll(async () => {
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';

      workflowQueueService = new WorkflowQueueService(
        new WorkflowInMemoryProviderService()
      );
      await workflowQueueService.queue.obliterate();
    });

    afterAll(async () => {
      await workflowQueueService.gracefulShutdown();
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    });

    it('should have prefix in cluster mode', async () => {
      expect(workflowQueueService.queue.opts.prefix).toEqual(
        '{trigger-handler}'
      );
    });
  });
});

import { Test } from '@nestjs/testing';
import { IHeaders, IInboundParseJobDto } from '../../dtos';
import { BullMqService } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { InboundParseQueueService } from './inbound-parse-queue.service';

let inboundParseQueueService: InboundParseQueueService;

describe('Inbound Parse Queue service', () => {
  describe('General', () => {
    beforeAll(async () => {
      inboundParseQueueService = new InboundParseQueueService(new WorkflowInMemoryProviderService());
      await inboundParseQueueService.queue.obliterate();
    });

    beforeEach(async () => {
      await inboundParseQueueService.queue.drain();
    });

    afterAll(async () => {
      await inboundParseQueueService.gracefulShutdown();
    });

    it('should be initialised properly', async () => {
      expect(inboundParseQueueService).toBeDefined();
      expect(Object.keys(inboundParseQueueService)).toEqual(
        expect.arrayContaining(['topic', 'DEFAULT_ATTEMPTS', 'instance', 'queue'])
      );
      expect(inboundParseQueueService.DEFAULT_ATTEMPTS).toEqual(3);
      expect(inboundParseQueueService.topic).toEqual('inbound-parse-mail');
      expect(await inboundParseQueueService.getStatus()).toEqual({
        queueIsPaused: false,
        queueName: 'inbound-parse-mail',
        workerName: undefined,
        workerIsPaused: undefined,
        workerIsRunning: undefined,
      });
      expect(await inboundParseQueueService.isPaused()).toEqual(false);
      expect(inboundParseQueueService.queue).toMatchObject(
        expect.objectContaining({
          _events: {},
          _eventsCount: 0,
          _maxListeners: undefined,
          name: 'inbound-parse-mail',
          jobsOpts: {
            removeOnComplete: true,
          },
        })
      );
      expect(inboundParseQueueService.queue.opts.prefix).toEqual('bull');
    });

    it('should add a job in the queue', async () => {
      const jobId = 'inbound-parse-mail-job-id';
      const _organizationId = 'inbound-parse-mail-organization-id';
      const jobData = {
        html: '<>Hello World</>',
        text: 'text',
        subject: 'subject',
        messageId: '123',
      };

      await inboundParseQueueService.add({
        name: jobId,
        data: jobData as any,
        groupId: _organizationId,
      });

      expect(await inboundParseQueueService.queue.getActiveCount()).toEqual(0);
      expect(await inboundParseQueueService.queue.getWaitingCount()).toEqual(1);

      const inboundParseQueueJobs = await inboundParseQueueService.queue.getJobs();
      expect(inboundParseQueueJobs.length).toEqual(1);
      const [inboundParseQueueJob] = inboundParseQueueJobs;
      expect(inboundParseQueueJob).toMatchObject(
        expect.objectContaining({
          id: '1',
          name: jobId,
          data: jobData,
          attemptsMade: 0,
        })
      );
    });

    it('should add a minimal job in the queue', async () => {
      const jobId = 'inbound-parse-mail-job-id-2';
      const _environmentId = 'inbound-parse-mail-environment-id';
      const _organizationId = 'inbound-parse-mail-organization-id';
      const _userId = 'inbound-parse-mail-user-id';
      const jobData = {
        html: '<>Hello World</>',
        text: 'text',
        subject: 'subject',
        messageId: '123',
      };

      await inboundParseQueueService.add({
        name: jobId,
        data: jobData as any,
        groupId: _organizationId,
      });

      expect(await inboundParseQueueService.queue.getActiveCount()).toEqual(0);
      expect(await inboundParseQueueService.queue.getWaitingCount()).toEqual(1);

      const inboundParseQueueJobs = await inboundParseQueueService.queue.getJobs();
      expect(inboundParseQueueJobs.length).toEqual(1);
      const [inboundParseQueueJob] = inboundParseQueueJobs;
      expect(inboundParseQueueJob).toMatchObject(
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

      inboundParseQueueService = new InboundParseQueueService(new WorkflowInMemoryProviderService());
      await inboundParseQueueService.queue.obliterate();
    });

    afterAll(async () => {
      await inboundParseQueueService.gracefulShutdown();
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    });

    it('should have prefix in cluster mode', async () => {
      expect(inboundParseQueueService.queue.opts.prefix).toEqual('{inbound-parse-mail}');
    });
  });
});

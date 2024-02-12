import { expect } from 'chai';

import { IInboundParseDataDto } from '@novu/application-generic';

import { InboundMailService } from './inbound-mail.service';

let inboundMailService: InboundMailService;

describe('Inbound Mail Service', () => {
  describe('Non Cluster mode', () => {
    before(async () => {
      process.env.IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

      inboundMailService = new InboundMailService();
      await inboundMailService.inboundParseQueueService.queue.obliterate();
    });

    beforeEach(async () => {
      await inboundMailService.inboundParseQueueService.queue.drain();
    });

    after(async () => {
      await inboundMailService.inboundParseQueueService.gracefulShutdown();
    });

    it('should be initialised properly', async () => {
      expect(inboundMailService).to.be.ok;
      expect(inboundMailService.inboundParseQueueService.DEFAULT_ATTEMPTS).to.equal(3);
      expect(inboundMailService.inboundParseQueueService.topic).to.equal('inbound-parse-mail');
      expect(await inboundMailService.inboundParseQueueService.getStatus()).to.deep.equal({
        queueIsPaused: false,
        queueName: 'inbound-parse-mail',
        workerName: undefined,
        workerIsPaused: undefined,
        workerIsRunning: undefined,
      });
      expect(await inboundMailService.inboundParseQueueService.queue.isPaused()).to.equal(false);
      expect(inboundMailService.inboundParseQueueService.queue).to.deep.include({
        _events: {},
        _eventsCount: 0,
        _maxListeners: undefined,
        name: 'inbound-parse-mail',
        jobsOpts: {
          attempts: 5,
          backoff: {
            delay: 4000,
            type: 'exponential',
          },
          removeOnComplete: true,
          removeOnFail: true,
        },
      });
      expect(inboundMailService.inboundParseQueueService.queue.opts.prefix).to.equal('bull');
    });

    it('should add a job in the queue', async () => {
      const jobId = 'inbound-mail-parse-job-id';
      const html = '<>Hello World</>';
      const text = 'text';
      const _organizationId = 'inbound-mail-parse-organization-id';
      const jobData = {
        html: html,
        text: text,
      };

      await inboundMailService.inboundParseQueueService.add({
        name: jobId,
        data: jobData as IInboundParseDataDto,
        groupId: _organizationId,
      });

      expect(await inboundMailService.inboundParseQueueService.queue.getActiveCount()).to.equal(0);
      expect(await inboundMailService.inboundParseQueueService.queue.getWaitingCount()).to.equal(1);

      const inboundParseQueueServiceQueueJobs = await inboundMailService.inboundParseQueueService.queue.getJobs();
      expect(inboundParseQueueServiceQueueJobs.length).to.equal(1);
      const [inboundParseQueueServiceQueueJob] = inboundParseQueueServiceQueueJobs;
      expect(inboundParseQueueServiceQueueJob).to.deep.include({
        id: '1',
        name: jobId,
        data: jobData,
        attemptsMade: 0,
      });
    });
  });

  describe('Cluster mode', () => {
    beforeEach(async () => {
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';

      inboundMailService = new InboundMailService();
      await inboundMailService.inboundParseQueueService.queue.obliterate();
    });

    afterEach(async () => {
      await inboundMailService.inboundParseQueueService.gracefulShutdown();
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    });

    it('should have prefix in cluster mode', async () => {
      expect(inboundMailService.inboundParseQueueService.queue.opts.prefix).to.equal('{inbound-parse-mail}');
    });
  });
});

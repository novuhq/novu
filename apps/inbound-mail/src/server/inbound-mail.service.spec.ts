import { expect } from 'chai';

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
      expect(inboundMailService).to.have.all.keys('inboundParseQueue');
      expect(inboundMailService.inboundParseQueueService.DEFAULT_ATTEMPTS).to.equal(3);
      expect(inboundMailService.inboundParseQueueService.topic).to.equal('inbound-parse-mail');
      expect(await inboundMailService.inboundParseQueueService.bullMqService.getStatus()).to.deep.equal({
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
      const _environmentId = 'inbound-mail-parse-environment-id';
      const _organizationId = 'inbound-mail-parse-organization-id';
      const _userId = 'inbound-mail-parse-user-id';
      const jobData = {
        _id: jobId,
        test: 'inbound-mail-parse-job-data',
        _environmentId,
        _organizationId,
        _userId,
      };
      await inboundMailService.inboundParseQueueService.add(jobId, jobData, _organizationId);

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

    it('should add a minimal job in the queue', async () => {
      const jobId = 'inbound-parse-mail-job-id-2';
      const _environmentId = 'inbound-parse-mail-environment-id';
      const _organizationId = 'inbound-parse-mail-organization-id';
      const _userId = 'inbound-parse-mail-user-id';
      const jobData = {
        _id: jobId,
        test: 'inbound-parse-mail-job-data-2',
        _environmentId,
        _organizationId,
        _userId,
      };
      await inboundMailService.inboundParseQueueService.addMinimalJob(jobId, jobData, _organizationId);

      expect(await inboundMailService.inboundParseQueueService.queue.getActiveCount()).to.equal(0);
      expect(await inboundMailService.inboundParseQueueService.queue.getWaitingCount()).to.equal(1);

      const inboundParseQueueServiceQueueJobs = await inboundMailService.inboundParseQueueService.queue.getJobs();
      expect(inboundParseQueueServiceQueueJobs.length).to.equal(1);
      const [inboundParseQueueServiceQueueJob] = inboundParseQueueServiceQueueJobs;
      expect(inboundParseQueueServiceQueueJob).to.deep.include({
        id: '2',
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

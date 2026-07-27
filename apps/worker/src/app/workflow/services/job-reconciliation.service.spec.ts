import { PinoLogger, StandardQueueService } from '@novu/application-generic';
import { JobRepository, JobStatusEnum } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import { JobReconciliationService } from './job-reconciliation.service';

describe('JobReconciliationService', () => {
  let service: JobReconciliationService;
  let jobRepository: sinon.SinonStubbedInstance<JobRepository>;
  let standardQueueService: sinon.SinonStubbedInstance<StandardQueueService>;
  let logger: PinoLogger;

  const mockLogger = {
    setContext: () => {},
    warn: () => {},
    error: () => {},
  } as unknown as PinoLogger;

  beforeEach(() => {
    jobRepository = sinon.createStubInstance(JobRepository);
    standardQueueService = sinon.createStubInstance(StandardQueueService);
    logger = mockLogger;

    service = new JobReconciliationService(
      jobRepository as unknown as JobRepository,
      standardQueueService as unknown as StandardQueueService,
      logger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('reconcileOnStartup', () => {
    it('should query for DELAYED jobs with scheduleExtensionsCount > 0 and stale updatedAt', async () => {
      jobRepository.find.resolves([]);

      await service.reconcileOnStartup();

      const findCall = jobRepository.find.getCall(0);
      expect(findCall).to.not.be.undefined;
      expect(findCall.args[0].status).to.equal(JobStatusEnum.DELAYED);
      expect(findCall.args[0].scheduleExtensionsCount).to.deep.equal({ $gt: 0 });
      expect(findCall.args[0].updatedAt).to.have.property('$lt');
      expect(findCall.args[1]).to.equal('_id _environmentId _organizationId _userId');
    });

    it('should not call add when no stuck jobs exist', async () => {
      jobRepository.find.resolves([]);

      await service.reconcileOnStartup();

      sinon.assert.notCalled(jobRepository.findOneAndUpdate);
      sinon.assert.notCalled(standardQueueService.add);
    });

    it('should atomically claim and re-enqueue a stuck job', async () => {
      const jobId = 'job-1';
      const envId = 'env-1';
      const orgId = 'org-1';
      const userId = 'user-1';

      const stuckJob = {
        _id: jobId,
        _environmentId: envId,
        _organizationId: orgId,
        _userId: userId,
        scheduleExtensionsCount: 1,
        status: JobStatusEnum.DELAYED,
        updatedAt: new Date(Date.now() - 60_000),
      };

      jobRepository.find.resolves([stuckJob]);
      jobRepository.findOneAndUpdate.resolves({ ...stuckJob, status: JobStatusEnum.QUEUED });
      standardQueueService.add.resolves();

      await service.reconcileOnStartup();

      sinon.assert.calledWith(
        jobRepository.findOneAndUpdate,
        {
          _id: jobId,
          _environmentId: envId,
          status: JobStatusEnum.DELAYED,
        },
        { $set: { status: JobStatusEnum.QUEUED } },
        { new: true }
      );

      sinon.assert.calledWith(standardQueueService.add, {
        name: jobId,
        data: {
          _environmentId: envId,
          _id: jobId,
          _organizationId: orgId,
          _userId: userId,
        },
        groupId: orgId,
        options: { delay: 0 },
      });
    });

    it('should skip a job when another worker already claimed it (findOneAndUpdate returns null)', async () => {
      const stuckJob = {
        _id: 'job-1',
        _environmentId: 'env-1',
        _organizationId: 'org-1',
        _userId: 'user-1',
        scheduleExtensionsCount: 1,
        status: JobStatusEnum.DELAYED,
        updatedAt: new Date(Date.now() - 60_000),
      };

      jobRepository.find.resolves([stuckJob]);
      jobRepository.findOneAndUpdate.resolves(null);

      await service.reconcileOnStartup();

      sinon.assert.calledOnce(jobRepository.findOneAndUpdate);
      sinon.assert.notCalled(standardQueueService.add);
    });

    it('should recover multiple stuck jobs and skip those already claimed by other workers', async () => {
      const baseTime = Date.now() - 120_000;

      const job1 = {
        _id: 'job-1',
        _environmentId: 'env-1',
        _organizationId: 'org-1',
        _userId: 'user-1',
        scheduleExtensionsCount: 1,
        status: JobStatusEnum.DELAYED,
        updatedAt: new Date(baseTime),
      };
      const job2 = {
        _id: 'job-2',
        _environmentId: 'env-1',
        _organizationId: 'org-1',
        _userId: 'user-2',
        scheduleExtensionsCount: 2,
        status: JobStatusEnum.DELAYED,
        updatedAt: new Date(baseTime),
      };

      jobRepository.find.resolves([job1, job2]);
      // job1 gets claimed by this worker, job2 was already claimed
      jobRepository.findOneAndUpdate
        .withArgs(
          { _id: 'job-1', _environmentId: 'env-1', status: JobStatusEnum.DELAYED },
          { $set: { status: JobStatusEnum.QUEUED } },
          { new: true }
        )
        .resolves({ ...job1, status: JobStatusEnum.QUEUED });
      jobRepository.findOneAndUpdate
        .withArgs(
          { _id: 'job-2', _environmentId: 'env-1', status: JobStatusEnum.DELAYED },
          { $set: { status: JobStatusEnum.QUEUED } },
          { new: true }
        )
        .resolves(null);

      standardQueueService.add.resolves();

      await service.reconcileOnStartup();

      sinon.assert.calledTwice(jobRepository.findOneAndUpdate);
      sinon.assert.calledOnce(standardQueueService.add);
      sinon.assert.calledWith(
        standardQueueService.add,
        sinon.match({ name: 'job-1' })
      );
    });

    it('should handle queue insertion failure gracefully without crashing', async () => {
      const stuckJob = {
        _id: 'job-1',
        _environmentId: 'env-1',
        _organizationId: 'org-1',
        _userId: 'user-1',
        scheduleExtensionsCount: 1,
        status: JobStatusEnum.DELAYED,
        updatedAt: new Date(Date.now() - 60_000),
      };

      jobRepository.find.resolves([stuckJob]);
      jobRepository.findOneAndUpdate.resolves({ ...stuckJob, status: JobStatusEnum.QUEUED });
      standardQueueService.add.rejects(new Error('Queue unavailable'));

      // Should not throw
      await service.reconcileOnStartup();

      sinon.assert.calledOnce(jobRepository.findOneAndUpdate);
      sinon.assert.calledOnce(standardQueueService.add);
    });

    it('should skip jobs that were recently updated (within the backoff window)', async () => {
      const recentJob = {
        _id: 'job-1',
        _environmentId: 'env-1',
        _organizationId: 'org-1',
        _userId: 'user-1',
        scheduleExtensionsCount: 1,
        status: JobStatusEnum.DELAYED,
        updatedAt: new Date(), // very recent
      };

      jobRepository.find.resolves([]); // filtered by the MongoDB query
      await service.reconcileOnStartup();

      sinon.assert.notCalled(jobRepository.findOneAndUpdate);
      sinon.assert.notCalled(standardQueueService.add);
    });

    it('should handle database errors gracefully', async () => {
      jobRepository.find.rejects(new Error('MongoDB connection error'));

      // Should not throw
      await service.reconcileOnStartup();

      sinon.assert.notCalled(jobRepository.findOneAndUpdate);
      sinon.assert.notCalled(standardQueueService.add);
    });
  });
});

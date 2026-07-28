import { PinoLogger, StandardQueueService } from '@novu/application-generic';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
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

  const makeStub = (overrides: Record<string, unknown> = {}) =>
    ({
      _id: 'job-1',
      _environmentId: 'env-1',
      _organizationId: 'org-1',
      _userId: 'user-1',
      scheduleExtensionsCount: 1,
      status: JobStatusEnum.DELAYED,
      updatedAt: new Date(Date.now() - 60_000),
      nextScheduledAt: new Date(Date.now() + 30_000).toISOString(),
      ...overrides,
    }) as unknown as JobEntity;

  describe('reconcileOnStartup', () => {
    it('should query for DELAYED jobs with scheduleExtensionsCount > 0 and stale updatedAt', async () => {
      jobRepository.find.resolves([]);

      await service.reconcileOnStartup();

      const findCall = jobRepository.find.getCall(0);
      expect(findCall).to.not.be.undefined;
      expect(findCall.args[0]._organizationId).to.deep.equal({ $exists: true });
      expect(findCall.args[0].status).to.equal(JobStatusEnum.DELAYED);
      expect(findCall.args[0].scheduleExtensionsCount).to.deep.equal({ $gt: 0 });
      expect(findCall.args[0].updatedAt).to.have.property('$lt');
      expect(findCall.args[1]).to.equal('_id _environmentId _organizationId _userId nextScheduledAt');
    });

    it('should not call add when no stuck jobs exist', async () => {
      jobRepository.find.resolves([]);

      await service.reconcileOnStartup();

      sinon.assert.notCalled(jobRepository.findOneAndUpdate);
      sinon.assert.notCalled(standardQueueService.add);
    });

    it('should queue before claiming (reversed order)', async () => {
      const stub = makeStub();

      jobRepository.find.resolves([stub]);
      jobRepository.findOneAndUpdate.resolves(makeStub({ status: JobStatusEnum.QUEUED }));
      standardQueueService.add.resolves();

      await service.reconcileOnStartup();

      sinon.assert.callOrder(standardQueueService.add, jobRepository.findOneAndUpdate);
    });

    it('should preserve remaining delay from nextScheduledAt', async () => {
      const futureMs = 30_000;
      const stub = makeStub({ nextScheduledAt: new Date(Date.now() + futureMs).toISOString() });

      jobRepository.find.resolves([stub]);
      jobRepository.findOneAndUpdate.resolves(makeStub({ status: JobStatusEnum.QUEUED }));
      standardQueueService.add.resolves();

      await service.reconcileOnStartup();

      const addCall = standardQueueService.add.getCall(0);
      expect(addCall).to.not.be.undefined;
      const args = addCall!.args[0] as any;
      expect(args.options.delay).to.be.greaterThan(0);
      expect(args.options.delay).to.be.at.most(futureMs);
    });

    it('should use delay 0 when nextScheduledAt is in the past', async () => {
      const stub = makeStub({ nextScheduledAt: new Date(Date.now() - 10_000).toISOString() });

      jobRepository.find.resolves([stub]);
      jobRepository.findOneAndUpdate.resolves(makeStub({ status: JobStatusEnum.QUEUED }));
      standardQueueService.add.resolves();

      await service.reconcileOnStartup();

      const addCall = standardQueueService.add.getCall(0);
      expect(addCall).to.not.be.undefined;
      expect((addCall!.args[0] as any).options.delay).to.equal(0);
    });

    it('should skip a job when another worker already claimed it', async () => {
      const stub = makeStub();

      jobRepository.find.resolves([stub]);
      standardQueueService.add.resolves();
      jobRepository.findOneAndUpdate.resolves(null);

      await service.reconcileOnStartup();

      sinon.assert.calledOnce(standardQueueService.add);
      sinon.assert.calledOnce(jobRepository.findOneAndUpdate);
    });

    it('should not attempt to claim if queue insertion fails', async () => {
      const stub = makeStub();

      jobRepository.find.resolves([stub]);
      standardQueueService.add.rejects(new Error('Queue unavailable'));

      await service.reconcileOnStartup();

      sinon.assert.calledOnce(standardQueueService.add);
      sinon.assert.notCalled(jobRepository.findOneAndUpdate);
    });

    it('should recover multiple stuck jobs and skip those already claimed by other workers', async () => {
      const job1 = makeStub({ _id: 'job-1', _userId: 'user-1' });
      const job2 = makeStub({ _id: 'job-2', _userId: 'user-2' });

      jobRepository.find.resolves([job1, job2]);
      standardQueueService.add.resolves();

      jobRepository.findOneAndUpdate
        .withArgs(
          { _id: 'job-1', _environmentId: 'env-1', status: JobStatusEnum.DELAYED },
          { $set: { status: JobStatusEnum.QUEUED } },
          { new: true }
        )
        .resolves(makeStub({ _id: 'job-1', status: JobStatusEnum.QUEUED }));
      jobRepository.findOneAndUpdate
        .withArgs(
          { _id: 'job-2', _environmentId: 'env-1', status: JobStatusEnum.DELAYED },
          { $set: { status: JobStatusEnum.QUEUED } },
          { new: true }
        )
        .resolves(null);

      await service.reconcileOnStartup();

      sinon.assert.calledTwice(standardQueueService.add);
      sinon.assert.calledTwice(jobRepository.findOneAndUpdate);
    });

    it('should handle queue insertion failure gracefully without crashing', async () => {
      const stub = makeStub();

      jobRepository.find.resolves([stub]);
      standardQueueService.add.rejects(new Error('Queue unavailable'));

      await service.reconcileOnStartup();

      sinon.assert.calledOnce(standardQueueService.add);
      sinon.assert.notCalled(jobRepository.findOneAndUpdate);
    });

    it('should skip jobs that were recently updated (within the backoff window)', async () => {
      jobRepository.find.resolves([]);
      await service.reconcileOnStartup();

      sinon.assert.notCalled(jobRepository.findOneAndUpdate);
      sinon.assert.notCalled(standardQueueService.add);
    });

    it('should handle database errors gracefully', async () => {
      jobRepository.find.rejects(new Error('MongoDB connection error'));

      await service.reconcileOnStartup();

      sinon.assert.notCalled(jobRepository.findOneAndUpdate);
      sinon.assert.notCalled(standardQueueService.add);
    });

    it('should paginate through more than MAX_RECONCILE_PER_RUN stuck jobs', async () => {
      const makeBatch = (start: number, count: number): JobEntity[] =>
        Array.from({ length: count }, (_, i) =>
          makeStub({ _id: `job-${start + i}` })
        );

      jobRepository.find
        .onFirstCall()
        .resolves(makeBatch(0, 100))
        .onSecondCall()
        .resolves(makeBatch(100, 50))
        .onThirdCall()
        .resolves([]);

      standardQueueService.add.resolves();
      jobRepository.findOneAndUpdate.resolves(makeStub({ status: JobStatusEnum.QUEUED }));

      await service.reconcileOnStartup();

      sinon.assert.calledThrice(jobRepository.find);
      sinon.assert.callCount(standardQueueService.add, 150);
    });
  });
});

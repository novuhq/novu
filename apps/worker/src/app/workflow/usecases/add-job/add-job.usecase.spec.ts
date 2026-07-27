import { Test } from '@nestjs/testing';
import {
  ComputeJobWaitDurationService,
  ConditionsFilter,
  CreateExecutionDetails,
  NormalizeVariables,
  PinoLogger,
  StandardQueueService,
  StepRunRepository,
  TierRestrictionsValidateUsecase,
} from '@novu/application-generic';
import {
  JobEntity,
  JobRepository,
  JobStatusEnum,
  NotificationRepository,
  SubscriberRepository,
} from '@novu/dal';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  StepTypeEnum,
} from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ExecuteBridgeJob } from '../../execute-bridge-job';
import { AddJob, BackoffStrategiesEnum } from './add-job.usecase';
import { AddJobCommand } from './add-job.command';
import { MergeOrCreateDigest } from './merge-or-create-digest.usecase';

describe('AddJob - reverse order (queue before DB update)', () => {
  let addJob: AddJob;
  let jobRepository: sinon.SinonStubbedInstance<JobRepository>;
  let standardQueueService: sinon.SinonStubbedInstance<StandardQueueService>;
  let stepRunRepository: sinon.SinonStubbedInstance<StepRunRepository>;
  let createExecutionDetails: sinon.SinonStubbedInstance<CreateExecutionDetails>;

  const mockLogger = {
    setContext: () => {},
    warn: () => {},
    error: () => {},
    info: () => {},
    debug: () => {},
    trace: () => {},
  } as unknown as PinoLogger;

  beforeEach(async () => {
    jobRepository = sinon.createStubInstance(JobRepository);
    standardQueueService = sinon.createStubInstance(StandardQueueService);
    stepRunRepository = sinon.createStubInstance(StepRunRepository);
    createExecutionDetails = {
      execute: sinon.stub().resolves({}),
    } as unknown as CreateExecutionDetails;

    const moduleRef = await Test.createTestingModule({
      providers: [
        AddJob,
        { provide: JobRepository, useValue: jobRepository },
        { provide: StandardQueueService, useValue: standardQueueService },
        { provide: CreateExecutionDetails, useValue: createExecutionDetails },
        { provide: StepRunRepository, useValue: stepRunRepository },
        { provide: ComputeJobWaitDurationService, useValue: { calculateDelay: async () => 0 } },
        { provide: ConditionsFilter, useValue: { filter: async () => ({ passed: true, variables: {} }) } },
        { provide: NormalizeVariables, useValue: { execute: async () => ({}) } },
        { provide: TierRestrictionsValidateUsecase, useValue: { execute: async () => [] } },
        { provide: ExecuteBridgeJob, useValue: { execute: async () => null } },
        { provide: SubscriberRepository, useValue: { findOne: async () => null } },
        { provide: MergeOrCreateDigest, useValue: { execute: async () => null } },
        { provide: NotificationRepository, useValue: { findOne: async () => ({ _id: 'notif-1', _environmentId: 'env-1' }) } },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    addJob = moduleRef.get(AddJob);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute with non-deferred job type (EMAIL)', () => {
    const environmentId = 'env-1';
    const organizationId = 'org-1';
    const userId = 'user-1';

    const createJob = (overrides: Partial<JobEntity> = {}): JobEntity =>
      ({
        _id: 'job-1',
        _environmentId: environmentId,
        _organizationId: organizationId,
        _userId: userId,
        _subscriberId: 'sub-1',
        _templateId: 'template-1',
        _notificationId: 'notif-1',
        transactionId: 'tx-1',
        type: StepTypeEnum.EMAIL,
        status: JobStatusEnum.PENDING,
        step: {
          filters: [],
          template: { type: StepTypeEnum.EMAIL },
        },
        payload: {},
        overrides: {},
        ...overrides,
      }) as JobEntity;

    it('should call queueJob BEFORE updateStatus for non-deferred jobs', async () => {
      const job = createJob();

      jobRepository.findOne.resolves(job);
      stepRunRepository.create.resolves();
      standardQueueService.add.resolves();
      jobRepository.updateStatus.resolves(job);

      await addJob.execute(
        AddJobCommand.create({
          environmentId,
          organizationId,
          userId,
          jobId: job._id,
          job,
        })
      );

      // queueJob (standardQueueService.add) should be called BEFORE updateStatus
      sinon.assert.callOrder(
        standardQueueService.add,
        jobRepository.updateStatus
      );
    });

    it('should NOT update status if queueJob throws', async () => {
      const job = createJob();

      jobRepository.findOne.resolves(job);
      standardQueueService.add.rejects(new Error('Queue unavailable'));

      try {
        await addJob.execute(
          AddJobCommand.create({
            environmentId,
            organizationId,
            userId,
            jobId: job._id,
            job,
          })
        );
        expect.fail('Should have thrown');
      } catch (err) {
        sinon.assert.notCalled(jobRepository.updateStatus);
      }
    });

    it('should enqueue with the correct payload for non-deferred jobs', async () => {
      const job = createJob();

      jobRepository.findOne.resolves(job);
      stepRunRepository.create.resolves();
      standardQueueService.add.resolves();
      jobRepository.updateStatus.resolves(job);

      await addJob.execute(
        AddJobCommand.create({
          environmentId,
          organizationId,
          userId,
          jobId: job._id,
          job,
        })
      );

      sinon.assert.calledWith(standardQueueService.add, {
        name: job._id,
        data: {
          _environmentId: environmentId,
          _id: job._id,
          _organizationId: organizationId,
          _userId: userId,
        },
        groupId: organizationId,
        options: { delay: 0 },
      });
    });
  });
});

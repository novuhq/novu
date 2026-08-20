import { BadRequestException } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger, StandardQueueService } from '@novu/application-generic';
import { JobEntity, JobRepository, JobStatusEnum, TopicRepository, TopicSubscribersRepository } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ResumeWaitCommand } from './resume-wait.command';
import { ResumeWait } from './resume-wait.usecase';

describe('ResumeWait', () => {
  const environmentId = '507f1f77bcf86cd799439011';
  const organizationId = '507f1f77bcf86cd799439012';
  const userId = '507f1f77bcf86cd799439013';
  const transactionId = 'txn-wait-1';

  let usecase: ResumeWait;
  let jobRepository: sinon.SinonStubbedInstance<JobRepository>;
  let standardQueueService: sinon.SinonStubbedInstance<StandardQueueService>;
  let topicRepository: sinon.SinonStubbedInstance<TopicRepository>;
  let topicSubscribersRepository: sinon.SinonStubbedInstance<TopicSubscribersRepository>;
  let logger: sinon.SinonStubbedInstance<PinoLogger>;
  let featureFlagsService: { getFlag: sinon.SinonStub };

  beforeEach(() => {
    jobRepository = sinon.createStubInstance(JobRepository);
    standardQueueService = sinon.createStubInstance(StandardQueueService);
    topicRepository = sinon.createStubInstance(TopicRepository);
    topicSubscribersRepository = sinon.createStubInstance(TopicSubscribersRepository);
    logger = sinon.createStubInstance(PinoLogger);
    featureFlagsService = { getFlag: sinon.stub().resolves(true) };

    usecase = new ResumeWait(
      jobRepository as unknown as JobRepository,
      standardQueueService as unknown as StandardQueueService,
      topicRepository as unknown as TopicRepository,
      topicSubscribersRepository as unknown as TopicSubscribersRepository,
      logger as unknown as PinoLogger,
      featureFlagsService as unknown as FeatureFlagsService
    );
  });

  function command(overrides: Partial<ResumeWaitCommand> = {}): ResumeWaitCommand {
    return ResumeWaitCommand.create({
      userId,
      environmentId,
      organizationId,
      transactionId,
      stepId: 'await-answer',
      to: { subscriberId: 'sub-1' },
      ...overrides,
    });
  }

  function delayedWaitJob(subscriberId: string, id: string): JobEntity {
    return {
      _id: id,
      _environmentId: environmentId,
      _organizationId: organizationId,
      _userId: userId,
      transactionId,
      subscriberId,
      type: StepTypeEnum.WAIT,
      status: JobStatusEnum.DELAYED,
      step: { stepId: 'await-answer' },
    } as JobEntity;
  }

  it('throws 400 when to resolves to no recipients', async () => {
    try {
      await usecase.execute(command({ to: { topicKey: 'empty-topic' } as never }));
      expect.fail('expected BadRequestException');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
    }
  });

  it('returns resumed false when no DELAYED Wait jobs match', async () => {
    jobRepository.find.resolves([]);

    const result = await usecase.execute(command());

    expect(result).to.deep.equal({ resumed: false });
    expect(standardQueueService.add.called).to.equal(false);
  });

  it('resumes only the matching subscriber job and enqueues a unique resume job', async () => {
    const matched = delayedWaitJob('sub-1', 'job-1');
    jobRepository.find.resolves([matched]);
    jobRepository.update.resolves({ modified: 1, matched: 1 });
    standardQueueService.add.resolves();

    const result = await usecase.execute(
      command({
        to: { subscriberId: 'sub-1' },
        data: { answer: 'yes' },
      })
    );

    expect(result).to.deep.equal({ resumed: true });
    expect(jobRepository.find.firstCall.args[0]).to.deep.include({
      transactionId,
      type: StepTypeEnum.WAIT,
      status: JobStatusEnum.DELAYED,
      subscriberId: { $in: ['sub-1'] },
    });
    expect(jobRepository.update.firstCall.args[1]).to.deep.equal({
      $set: { stepOutput: { status: 'resumed', data: { answer: 'yes' } } },
    });
    expect(standardQueueService.add.firstCall.args[0].options).to.deep.include({
      delay: 0,
      jobId: 'job-1-resume',
    });
  });

  it('returns resumed false when a second resume finds no DELAYED match', async () => {
    jobRepository.find.resolves([]);

    const result = await usecase.execute(command());

    expect(result).to.deep.equal({ resumed: false });
  });

  it('does not enqueue when the job left DELAYED between find and update', async () => {
    jobRepository.find.resolves([delayedWaitJob('sub-1', 'job-1')]);
    jobRepository.update.resolves({ modified: 0, matched: 0 });

    const result = await usecase.execute(command());

    expect(result).to.deep.equal({ resumed: false });
    expect(standardQueueService.add.called).to.equal(false);
  });

  it('matches any DELAYED Wait job when stepId is omitted', async () => {
    const matched = delayedWaitJob('sub-1', 'job-1');
    jobRepository.find.resolves([matched]);
    jobRepository.update.resolves({ modified: 1, matched: 1 });
    standardQueueService.add.resolves();

    const result = await usecase.execute(command({ stepId: undefined }));

    expect(result).to.deep.equal({ resumed: true });
    expect(jobRepository.find.firstCall.args[0]).to.deep.include({
      transactionId,
      type: StepTypeEnum.WAIT,
      status: JobStatusEnum.DELAYED,
      subscriberId: { $in: ['sub-1'] },
    });
    expect(jobRepository.find.firstCall.args[0].$or).to.equal(undefined);
  });

  it('returns resumed false when the feature flag is off', async () => {
    featureFlagsService.getFlag.resolves(false);

    const result = await usecase.execute(command());

    expect(result).to.deep.equal({ resumed: false });
    expect(jobRepository.find.called).to.equal(false);
  });
});

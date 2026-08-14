import { CreateExecutionDetails, DetailEnum } from '@novu/application-generic';
import { JobRepository, MessageRepository } from '@novu/dal';
import { JobStatusEnum, StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SendMessageCommand } from './send-message.command';
import { SendMessageStatus } from './send-message-type.usecase';
import { SendMessageWait } from './send-message-wait.usecase';

describe('SendMessageWait', () => {
  let usecase: SendMessageWait;
  let jobRepository: sinon.SinonStubbedInstance<JobRepository>;
  let createExecutionDetails: sinon.SinonStubbedInstance<CreateExecutionDetails>;

  beforeEach(() => {
    jobRepository = sinon.createStubInstance(JobRepository);
    createExecutionDetails = sinon.createStubInstance(CreateExecutionDetails);
    usecase = new SendMessageWait(
      {} as MessageRepository,
      createExecutionDetails as unknown as CreateExecutionDetails,
      jobRepository as unknown as JobRepository
    );
  });

  function command(stepOutput?: Record<string, unknown>): SendMessageCommand {
    return {
      job: {
        _id: 'job-1',
        _environmentId: 'env-1',
        _organizationId: 'org-1',
        _notificationId: 'notification-1',
        _templateId: 'template-1',
        _subscriberId: 'internal-sub-1',
        subscriberId: 'sub-1',
        identifier: 'workflow-1',
        transactionId: 'txn-1',
        type: StepTypeEnum.WAIT,
        status: JobStatusEnum.RUNNING,
        createdAt: new Date(Date.now() - 5_000).toISOString(),
        stepOutput,
      },
    } as SendMessageCommand;
  }

  it('keeps a resumed result and does not overwrite stepOutput', async () => {
    const result = await usecase.execute(
      command({
        status: 'resumed',
        data: { answer: 'yes' },
      })
    );

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    expect(jobRepository.updateOne.called).to.equal(false);
    expect(createExecutionDetails.execute.firstCall.args[0].detail).to.equal(DetailEnum.STEP_RESUMED);
    expect(JSON.parse(createExecutionDetails.execute.firstCall.args[0].raw)).to.have.property('after');
    expect(createExecutionDetails.execute.secondCall.args[0].detail).to.equal(DetailEnum.STEP_COMPLETED);
  });

  it('writes expired when the timer wakes the job', async () => {
    jobRepository.updateOne.resolves();

    const result = await usecase.execute(command());

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    expect(jobRepository.updateOne.firstCall.args[1]).to.deep.equal({
      $set: { stepOutput: { status: 'expired' } },
    });
    expect(createExecutionDetails.execute.firstCall.args[0].detail).to.equal(DetailEnum.STEP_EXPIRED);
    expect(createExecutionDetails.execute.secondCall.args[0].detail).to.equal(DetailEnum.STEP_COMPLETED);
  });
});

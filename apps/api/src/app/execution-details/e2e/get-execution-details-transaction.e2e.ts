import { ExecutionDetailsRepository } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Execution details - Get execution details by transaction id - /v1/execution-details/transaction/:transactionId (GET)', function () {
  let session: UserSession;
  const executionDetailsRepository: ExecutionDetailsRepository = new ExecutionDetailsRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get execution details by transactionId', async function () {
    const transactionId = ExecutionDetailsRepository.createObjectId();
    const detail = await executionDetailsRepository.create({
      _jobId: ExecutionDetailsRepository.createObjectId(),
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _notificationId: ExecutionDetailsRepository.createObjectId(),
      _notificationTemplateId: ExecutionDetailsRepository.createObjectId(),
      _subscriberId: session.subscriberId,
      providerId: '',
      transactionId: transactionId,
      channel: StepTypeEnum.EMAIL,
      detail: '',
      source: ExecutionDetailsSourceEnum.INTERNAL,
      status: ExecutionDetailsStatusEnum.SUCCESS,
      isTest: false,
      isRetry: false,
    });

    const { body } = await session.testAgent.get(`/v1/execution-details/transaction/${transactionId}`);

    const responseDetail = body.data[0];
    expect(responseDetail.transactionId).to.equal(transactionId);
    expect(responseDetail.channel).to.equal(detail.channel);
    expect(responseDetail._id).to.equal(detail._id);
  });
});

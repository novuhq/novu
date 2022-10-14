import { ExecutionDetailsRepository } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';

const axiosInstance = axios.create();

describe('Execution details - Get execution details by notification id - /v1/execution-details/notification/:notificationId (GET)', function () {
  let session: UserSession;
  const executionDetailsRepository: ExecutionDetailsRepository = new ExecutionDetailsRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get execution details', async function () {
    const notificationId = ExecutionDetailsRepository.createObjectId();
    const detail = await executionDetailsRepository.create({
      _jobId: ExecutionDetailsRepository.createObjectId(),
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _notificationId: notificationId,
      _notificationTemplateId: ExecutionDetailsRepository.createObjectId(),
      _subscriberId: session.subscriberId,
      providerId: '',
      transactionId: 'transactionId',
      channel: StepTypeEnum.EMAIL,
      detail: '',
      source: ExecutionDetailsSourceEnum.INTERNAL,
      status: ExecutionDetailsStatusEnum.SUCCESS,
      isTest: false,
      isRetry: false,
    });

    const {
      data: { data },
    } = await axiosInstance.get(
      `${session.serverUrl}/v1/execution-details?notificationId=${notificationId}&subscriberId=${session.subscriberId}`,
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );
    const responseDetail = data[0];
    expect(responseDetail._notificationId).to.equal(notificationId);
    expect(responseDetail.channel).to.equal(detail.channel);
    expect(responseDetail._id).to.equal(detail._id);
  });
});

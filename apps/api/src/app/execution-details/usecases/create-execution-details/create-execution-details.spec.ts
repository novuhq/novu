import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { ExecutionDetailsRepository } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';

import { CreateExecutionDetails } from './create-execution-details.usecase';
import { CreateExecutionDetailsCommand } from './create-execution-details.command';

import { SharedModule } from '../../../shared/shared.module';
import { ExecutionDetailsModule } from '../../execution-details.module';

describe('Create Execution Details', function () {
  let useCase: CreateExecutionDetails;
  let session: UserSession;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, ExecutionDetailsModule],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<CreateExecutionDetails>(CreateExecutionDetails);
  });

  it('should create the execution details for a job of a notification', async function () {
    const command = CreateExecutionDetailsCommand.create({
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      subscriberId: session.subscriberId,
      jobId: ExecutionDetailsRepository.createObjectId(),
      notificationId: ExecutionDetailsRepository.createObjectId(),
      notificationTemplateId: ExecutionDetailsRepository.createObjectId(),
      messageId: ExecutionDetailsRepository.createObjectId(),
      providerId: 'test-provider-id',
      transactionId: 'test-transaction-id',
      channel: StepTypeEnum.SMS,
      detail: 'test',
      source: ExecutionDetailsSourceEnum.WEBHOOK,
      status: ExecutionDetailsStatusEnum.SUCCESS,
      isTest: false,
      isRetry: false,
    });

    const result = await useCase.execute(command);

    expect(result).to.ownProperty('id');
    expect(result).to.ownProperty('createdAt');
  });
});

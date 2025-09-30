import { Test } from '@nestjs/testing';
import { ExecutionDetailsRepository } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { CreateExecutionDetailsCommand } from './create-execution-details.command';
import { CreateExecutionDetails } from './create-execution-details.usecase';
import { DetailEnum } from './types';

describe('Create Execution Details', () => {
  let useCase: CreateExecutionDetails;
  let session: UserSession;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ExecutionDetailsRepository, CreateExecutionDetails],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<CreateExecutionDetails>(CreateExecutionDetails);
  });

  it('should create the execution details for a job of a notification', async () => {
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
      detail: DetailEnum.MESSAGE_SENT,
      source: ExecutionDetailsSourceEnum.WEBHOOK,
      status: ExecutionDetailsStatusEnum.SUCCESS,
      isTest: false,
      isRetry: false,
      workflowRunIdentifier: 'test-workflow-run-identifier',
    });

    const result = await useCase.execute(command);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('createdAt');
  });
});

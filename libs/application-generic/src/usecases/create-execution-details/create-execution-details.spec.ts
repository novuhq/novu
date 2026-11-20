import { Test } from '@nestjs/testing';
import { DalService, ExecutionDetailsRepository } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import { FeatureFlagsService } from '../../services';
import { TraceLogRepository } from '../../services/analytic-logs/trace-log';
import { CreateExecutionDetailsCommand } from './create-execution-details.command';
import { CreateExecutionDetails } from './create-execution-details.usecase';
import { DetailEnum } from './types';

describe('Create Execution Details', () => {
  const dalService = new DalService();
  const executionDetailsRepository = new ExecutionDetailsRepository();
  const traceLogRepository = { createStepRun: vi.fn() };
  let useCase: CreateExecutionDetails;

  beforeAll(async () => {
    await dalService.connect(process.env.MONGO_URL as string);
  });

  afterAll(async () => {
    await dalService.disconnect();
  });

  beforeEach(async () => {
    traceLogRepository.createStepRun.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateExecutionDetails,
        ExecutionDetailsRepository,
        { provide: TraceLogRepository, useValue: traceLogRepository },
        {
          provide: FeatureFlagsService,
          useValue: { getFlag: vi.fn(async ({ defaultValue }) => defaultValue) },
        },
      ],
    }).compile();

    useCase = moduleRef.get<CreateExecutionDetails>(CreateExecutionDetails);
  });

  it('should create the execution details for a job of a notification', async () => {
    const environmentId = ExecutionDetailsRepository.createObjectId();
    const jobId = ExecutionDetailsRepository.createObjectId();
    const command = CreateExecutionDetailsCommand.create({
      organizationId: ExecutionDetailsRepository.createObjectId(),
      environmentId,
      subscriberId: 'test-subscriber-id',
      _subscriberId: ExecutionDetailsRepository.createObjectId(),
      jobId,
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

    await useCase.execute(command);

    const stored = await executionDetailsRepository.findOne({ _environmentId: environmentId, _jobId: jobId });
    expect(stored?._id).toBeDefined();
    expect(stored?.createdAt).toBeDefined();
    expect(stored?.detail).toEqual(DetailEnum.MESSAGE_SENT);

    expect(traceLogRepository.createStepRun).toHaveBeenCalledWith([
      expect.objectContaining({
        event_type: 'message_sent',
        status: 'success',
        entity_id: jobId,
        external_subscriber_id: 'test-subscriber-id',
      }),
    ]);
  });
});

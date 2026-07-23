import { Logger } from '@nestjs/common';
import { NotificationStepEntity } from '@novu/dal';
import { DigestTypeEnum, StepTypeEnum } from '@novu/shared';
import { DigestFilterSteps } from '../digest-filter-steps';
import { CreateNotificationJobsCommand } from './create-notification-jobs.command';
import { CreateNotificationJobs } from './create-notification-jobs.usecase';

// ESM-only dependencies pulled in transitively (analytic-logs → p-queue, feature-flags → LaunchDarkly);
// jest 27 cannot parse them, and the spec injects its own mocks anyway.
jest.mock('p-queue', () => ({ __esModule: true, default: class PQueueMock {} }));
jest.mock('@launchdarkly/node-server-sdk', () => ({ init: jest.fn() }));

const ENVIRONMENT_ID = 'aaaaaaaaaaaaaaaaaaaaaaa1';
const ORGANIZATION_ID = 'aaaaaaaaaaaaaaaaaaaaaaa2';
const USER_ID = 'aaaaaaaaaaaaaaaaaaaaaaa3';
const WORKFLOW_ID = 'aaaaaaaaaaaaaaaaaaaaaaa4';
const SUBSCRIBER_ID = 'aaaaaaaaaaaaaaaaaaaaaaa5';
const NOTIFICATION_ID = 'aaaaaaaaaaaaaaaaaaaaaaa6';
const EMAIL_TEMPLATE_ID = 'aaaaaaaaaaaaaaaaaaaaaaa7';
const MISSING_TEMPLATE_ID = 'aaaaaaaaaaaaaaaaaaaaaaa8';
const DIGEST_TEMPLATE_ID = 'aaaaaaaaaaaaaaaaaaaaaaa9';

describe('CreateNotificationJobs', () => {
  beforeEach(() => {
    jest.spyOn(Logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function buildUsecase() {
    const notificationRepository = {
      create: jest.fn().mockResolvedValue({
        _id: NOTIFICATION_ID,
        _templateId: WORKFLOW_ID,
        _subscriberId: SUBSCRIBER_ID,
        transactionId: 'tx_1',
        channels: [],
      }),
    };
    const workflowRunRepository = { create: jest.fn() };
    const traceLogRepository = { createWorkflowRun: jest.fn() };
    const featureFlagsService = { getFlag: jest.fn().mockResolvedValue(false) };
    const digestFilterSteps = new DigestFilterSteps();

    const usecase = new CreateNotificationJobs(
      digestFilterSteps,
      notificationRepository as never,
      workflowRunRepository as never,
      traceLogRepository as never,
      featureFlagsService as never
    );

    return { usecase, notificationRepository, digestFilterSteps };
  }

  function buildEmailStep(overrides: Partial<NotificationStepEntity> = {}): NotificationStepEntity {
    return {
      _templateId: EMAIL_TEMPLATE_ID,
      stepId: 'email-step',
      active: true,
      template: { _id: EMAIL_TEMPLATE_ID, type: StepTypeEnum.EMAIL },
      ...overrides,
    } as NotificationStepEntity;
  }

  function buildBrokenStep(): NotificationStepEntity {
    return {
      _templateId: MISSING_TEMPLATE_ID,
      stepId: 'broken-step',
      active: true,
      template: null,
    } as unknown as NotificationStepEntity;
  }

  function buildDigestStep(): NotificationStepEntity {
    return {
      _templateId: DIGEST_TEMPLATE_ID,
      stepId: 'digest-step',
      active: true,
      template: { _id: DIGEST_TEMPLATE_ID, type: StepTypeEnum.DIGEST },
      metadata: { type: DigestTypeEnum.REGULAR, amount: 1, unit: 'hours' },
    } as unknown as NotificationStepEntity;
  }

  function buildCommand(steps: NotificationStepEntity[]): CreateNotificationJobsCommand {
    return {
      environmentId: ENVIRONMENT_ID,
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      identifier: 'test-workflow',
      overrides: {},
      payload: {},
      subscriber: { _id: SUBSCRIBER_ID, subscriberId: 'external-subscriber-1' },
      template: { _id: WORKFLOW_ID, name: 'Test workflow', steps, tags: [], triggers: [] },
      templateProviderIds: {},
      to: { subscriberId: 'external-subscriber-1' },
      transactionId: 'tx_1',
      contextKeys: [],
    } as unknown as CreateNotificationJobsCommand;
  }

  it('should skip active steps with a missing template and build jobs for the valid ones', async () => {
    const { usecase } = buildUsecase();
    const command = buildCommand([buildEmailStep(), buildBrokenStep()]);

    const jobs = await usecase.execute(command);

    expect(jobs.map((job) => job.type)).toEqual([StepTypeEnum.TRIGGER, StepTypeEnum.EMAIL]);
    expect(Logger.error).toHaveBeenCalledWith(expect.stringContaining(MISSING_TEMPLATE_ID), expect.anything());
  });

  it('should throw when all active steps have missing templates', async () => {
    const { usecase, notificationRepository } = buildUsecase();
    const command = buildCommand([buildBrokenStep()]);

    await expect(usecase.execute(command)).rejects.toThrow(
      `No active steps with templates found for workflow ${WORKFLOW_ID}`
    );
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });

  it('should never reintroduce steps with missing templates through the digest path', async () => {
    const { usecase, digestFilterSteps } = buildUsecase();
    const digestFilterStepsSpy = jest.spyOn(digestFilterSteps, 'execute');
    const command = buildCommand([buildDigestStep(), buildBrokenStep()]);

    const jobs = await usecase.execute(command);

    expect(jobs.map((job) => job.type)).toEqual([StepTypeEnum.TRIGGER, StepTypeEnum.DIGEST]);
    // The digest path receives the already-filtered steps, so the orphan never re-enters
    const digestCommand = digestFilterStepsSpy.mock.calls[0][0];
    expect(digestCommand.steps.map((step) => step._templateId)).toEqual([DIGEST_TEMPLATE_ID]);
  });

  it('should ignore inactive steps with missing templates', async () => {
    const { usecase } = buildUsecase();
    const inactiveBrokenStep = { ...buildBrokenStep(), active: false } as NotificationStepEntity;
    const command = buildCommand([buildEmailStep(), inactiveBrokenStep]);

    const jobs = await usecase.execute(command);

    expect(jobs.map((job) => job.type)).toEqual([StepTypeEnum.TRIGGER, StepTypeEnum.EMAIL]);
    expect(Logger.error).not.toHaveBeenCalled();
  });
});

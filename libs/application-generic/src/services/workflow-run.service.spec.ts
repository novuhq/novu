import { Test, TestingModule } from '@nestjs/testing';
import { JobRepository, MessageRepository, NotificationRepository, NotificationTemplateRepository } from '@novu/dal';
import { DeliveryLifecycleStatusEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { PinoLogger } from '../logging';
import { TraceLogRepository } from './analytic-logs/trace-log';
import { WorkflowRunRepository, WorkflowRunStatusEnum } from './analytic-logs/workflow-run';
import { FeatureFlagsService } from './feature-flags';
import { WorkflowRunService } from './workflow-run.service';

// ESM-only dependencies pulled in transitively (analytic-logs → p-queue, feature-flags → LaunchDarkly);
// jest 27 cannot parse them, and the spec injects its own mocks anyway.
jest.mock('p-queue', () => ({ __esModule: true, default: class PQueueMock {} }));
jest.mock('@launchdarkly/node-server-sdk', () => ({ init: jest.fn() }));

describe('WorkflowRunService', () => {
  let service: WorkflowRunService;
  let notificationRepository: {
    findOne: jest.Mock;
    tryWorkflowStatusTransition: jest.Mock;
    tryDeliveryLifecycleTransition: jest.Mock;
  };
  let notificationTemplateRepository: { findOne: jest.Mock };
  let traceLogRepository: { createWorkflowRun: jest.Mock };
  let workflowRunRepository: { updateWorkflowRunState: jest.Mock };
  let featureFlagsService: { getFlag: jest.Mock };
  let logger: { setContext: jest.Mock; debug: jest.Mock; trace: jest.Mock; error: jest.Mock };

  const notificationId = 'notif-1';
  const organizationId = 'org-1';
  const environmentId = 'env-1';
  const subscriberId = 'sub-1';

  const notification = {
    _id: notificationId,
    _templateId: 'template-1',
    _organizationId: organizationId,
    _environmentId: environmentId,
    _subscriberId: subscriberId,
    transactionId: 'txn-1',
    channels: ['in_app'],
    to: { subscriberId: 'ext-sub-1' },
  };

  const workflow = {
    name: 'Test Workflow',
    triggers: [{ identifier: 'test-workflow' }],
  };

  const statusTraceCalls = () =>
    traceLogRepository.createWorkflowRun.mock.calls.filter((call) =>
      String(call[0]?.[0]?.event_type || '').startsWith('workflow_run_status_')
    );

  beforeEach(async () => {
    notificationRepository = {
      findOne: jest.fn().mockResolvedValue(notification),
      tryWorkflowStatusTransition: jest.fn().mockResolvedValue({ isUpdated: true }),
      tryDeliveryLifecycleTransition: jest.fn().mockResolvedValue({ isUpdated: true }),
    };
    notificationTemplateRepository = {
      findOne: jest.fn().mockResolvedValue(workflow),
    };
    traceLogRepository = {
      createWorkflowRun: jest.fn().mockResolvedValue(undefined),
    };
    workflowRunRepository = {
      updateWorkflowRunState: jest.fn().mockResolvedValue(undefined),
    };
    featureFlagsService = {
      getFlag: jest.fn().mockImplementation(({ key }) => {
        if (key === FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_TRACES_WRITE_ENABLED) {
          return Promise.resolve(true);
        }

        return Promise.resolve(false);
      }),
    };
    logger = {
      setContext: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowRunService,
        { provide: JobRepository, useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: MessageRepository, useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: WorkflowRunRepository, useValue: workflowRunRepository },
        { provide: NotificationRepository, useValue: notificationRepository },
        { provide: NotificationTemplateRepository, useValue: notificationTemplateRepository },
        { provide: TraceLogRepository, useValue: traceLogRepository },
        { provide: FeatureFlagsService, useValue: featureFlagsService },
        { provide: PinoLogger, useValue: logger },
      ],
    }).compile();

    service = module.get(WorkflowRunService);
  });

  describe('createWorkflowStatusTrace', () => {
    it('writes exactly one workflow_run_status_completed on first COMPLETED call', async () => {
      await service.createWorkflowStatusTrace(
        notificationId,
        'workflow_run_status_completed',
        { organizationId, environmentId },
        notification,
        workflow
      );

      expect(notificationRepository.tryWorkflowStatusTransition).toHaveBeenCalledWith(
        notificationId,
        organizationId,
        environmentId,
        'workflow_run_status_completed'
      );
      expect(traceLogRepository.createWorkflowRun).toHaveBeenCalledTimes(1);
      expect(traceLogRepository.createWorkflowRun).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            event_type: 'workflow_run_status_completed',
            entity_id: notificationId,
          }),
        ])
      );
    });

    it('writes zero additional status traces when tryWorkflowStatusTransition returns isUpdated false', async () => {
      notificationRepository.tryWorkflowStatusTransition.mockResolvedValue({
        isUpdated: false,
        previousEvent: 'workflow_run_status_completed',
      });

      await service.createWorkflowStatusTrace(
        notificationId,
        'workflow_run_status_completed',
        { organizationId, environmentId },
        notification,
        workflow
      );

      expect(notificationRepository.tryWorkflowStatusTransition).toHaveBeenCalledTimes(1);
      expect(traceLogRepository.createWorkflowRun).not.toHaveBeenCalled();
      expect(logger.trace).toHaveBeenCalled();
    });

    it('writes zero status traces for ERROR after COMPLETED was already recorded', async () => {
      notificationRepository.tryWorkflowStatusTransition.mockResolvedValue({
        isUpdated: false,
        previousEvent: 'workflow_run_status_completed',
      });

      await service.createWorkflowStatusTrace(
        notificationId,
        'workflow_run_status_error',
        { organizationId, environmentId },
        notification,
        workflow
      );

      expect(notificationRepository.tryWorkflowStatusTransition).toHaveBeenCalledWith(
        notificationId,
        organizationId,
        environmentId,
        'workflow_run_status_error'
      );
      expect(traceLogRepository.createWorkflowRun).not.toHaveBeenCalled();
    });
  });

  describe('updateDeliveryLifecycle', () => {
    it('writes zero status traces when emitStatusTrace is false', async () => {
      await service.updateDeliveryLifecycle({
        workflowStatus: WorkflowRunStatusEnum.COMPLETED,
        notificationId,
        environmentId,
        organizationId,
        _subscriberId: subscriberId,
        deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.INTERACTED,
        notification,
        workflow,
        emitStatusTrace: false,
      });

      expect(notificationRepository.tryWorkflowStatusTransition).not.toHaveBeenCalled();
      expect(statusTraceCalls()).toHaveLength(0);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { JobRepository, MessageRepository, NotificationRepository, NotificationTemplateRepository } from '@novu/dal';
import { DeliveryLifecycleStatusEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import type { Mock } from 'vitest';
import { PinoLogger } from '../logging';
import { TraceLogRepository } from './analytic-logs/trace-log';
import { WorkflowRunRepository, WorkflowRunStatusEnum } from './analytic-logs/workflow-run';
import { FeatureFlagsService } from './feature-flags';
import { WorkflowRunService } from './workflow-run.service';

// ESM-only dependencies pulled in transitively (analytic-logs → p-queue, feature-flags → LaunchDarkly);
// jest 27 cannot parse them, and the spec injects its own mocks anyway.
vi.mock('p-queue', () => ({ __esModule: true, default: class PQueueMock {} }));
vi.mock('@launchdarkly/node-server-sdk', () => ({ init: vi.fn() }));

describe('WorkflowRunService', () => {
  let service: WorkflowRunService;
  let notificationRepository: {
    findOne: Mock;
    tryWorkflowStatusTransition: Mock;
    tryDeliveryLifecycleTransition: Mock;
  };
  let notificationTemplateRepository: { findOne: Mock };
  let traceLogRepository: { createWorkflowRun: Mock };
  let workflowRunRepository: { updateWorkflowRunState: Mock };
  let featureFlagsService: { getFlag: Mock };
  let logger: { setContext: Mock; debug: Mock; trace: Mock; error: Mock };

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
      findOne: vi.fn().mockResolvedValue(notification),
      tryWorkflowStatusTransition: vi.fn().mockResolvedValue({ isUpdated: true }),
      tryDeliveryLifecycleTransition: vi.fn().mockResolvedValue({ isUpdated: true }),
    };
    notificationTemplateRepository = {
      findOne: vi.fn().mockResolvedValue(workflow),
    };
    traceLogRepository = {
      createWorkflowRun: vi.fn().mockResolvedValue(undefined),
    };
    workflowRunRepository = {
      updateWorkflowRunState: vi.fn().mockResolvedValue(undefined),
    };
    featureFlagsService = {
      getFlag: vi.fn().mockImplementation(({ key }) => {
        if (key === FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_TRACES_WRITE_ENABLED) {
          return Promise.resolve(true);
        }

        return Promise.resolve(false);
      }),
    };
    logger = {
      setContext: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      error: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowRunService,
        { provide: JobRepository, useValue: { find: vi.fn().mockResolvedValue([]) } },
        { provide: MessageRepository, useValue: { find: vi.fn().mockResolvedValue([]) } },
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
    it('writes zero status traces when emitStatusTrace is false (legacy path)', async () => {
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

    it('writes zero status traces when emitStatusTrace is false (transition path)', async () => {
      featureFlagsService.getFlag.mockImplementation(({ key }) => {
        if (
          key === FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_TRACES_WRITE_ENABLED ||
          key === FeatureFlagsKeysEnum.IS_DELIVERY_LIFECYCLE_TRANSITION_ENABLED
        ) {
          return Promise.resolve(true);
        }

        return Promise.resolve(false);
      });

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

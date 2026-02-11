import { Injectable, Logger } from '@nestjs/common';
import {
  JobEntity,
  JobStatusEnum,
  NotificationEntity,
  NotificationRepository,
  NotificationStepEntity,
} from '@novu/dal';
import {
  DeliveryLifecycleStatusEnum,
  DigestTypeEnum,
  FeatureFlagsKeysEnum,
  IDigestBaseMetadata,
  IWorkflowStepMetadata,
  SeverityLevelEnum,
  STEP_TYPE_TO_CHANNEL_TYPE,
  StepTypeEnum,
} from '@novu/shared';
import { InstrumentUsecase } from '../../instrumentation';
import {
  TraceLogRepository,
  WorkflowRunRepository,
  WorkflowRunStatusEnum,
  WorkflowRunTraceInput,
} from '../../services/analytic-logs';
import { LogRepository } from '../../services/analytic-logs/log.repository';
import { FeatureFlagsService } from '../../services/feature-flags';
import { getNestedValue } from '../../utils';
import { PlatformException } from '../../utils/exceptions';
import { DigestFilterSteps, DigestFilterStepsCommand } from '../digest-filter-steps';
import { CreateNotificationJobsCommand } from './create-notification-jobs.command';

const LOG_CONTEXT = 'CreateNotificationUseCase';
type NotificationJob = Omit<JobEntity, '_id' | 'createdAt' | 'updatedAt'>;

@Injectable()
export class CreateNotificationJobs {
  constructor(
    private digestFilterSteps: DigestFilterSteps,
    private notificationRepository: NotificationRepository,
    private workflowRunRepository: WorkflowRunRepository,
    private traceLogRepository: TraceLogRepository,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  public async execute(command: CreateNotificationJobsCommand): Promise<NotificationJob[]> {
    const activeSteps = this.filterActiveSteps(command.template.steps);

    const channels = activeSteps
      .map((item) => item.template.type as StepTypeEnum)
      .reduce<StepTypeEnum[]>((list, channel) => {
        if (list.includes(channel) || channel === StepTypeEnum.TRIGGER) {
          return list;
        }
        list.push(channel);

        return list;
      }, []);

    const notification = await this.createNotification(command, channels);

    if (!notification) {
      const message = 'Notification could not be created';
      const error = new PlatformException(message);
      Logger.error(error, message, LOG_CONTEXT);
      throw error;
    }

    const jobs: NotificationJob[] = [];

    const steps = await this.createSteps(command, activeSteps, notification);

    const adhocTriggerJob = this.createATriggerJobIfMissing(steps, command, notification);
    if (adhocTriggerJob) {
      jobs.push(adhocTriggerJob);
    }

    for (const step of steps) {
      if (!step.template) {
        throw new PlatformException('Step template was not found');
      }

      jobs.push(this.buildJobFromStep(step, command, notification));
    }

    return jobs;
  }

  private async createNotification(command: CreateNotificationJobsCommand, channels: StepTypeEnum[]) {
    const notification = await this.notificationRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command.subscriber._id,
      _templateId: command.template._id,
      topics: command.topics ?? [],
      transactionId: command.transactionId,
      to: command.to,
      payload: command.payload,
      channels,
      controls: command.controls,
      tags: command.template.tags,
      severity: command.severity,
      critical: command.critical,
      contextKeys: command.contextKeys,
    });

    await this.createWorkflowRun(notification, command);

    return notification;
  }

  private async createWorkflowRun(notification: NotificationEntity, command: CreateNotificationJobsCommand) {
    try {
      await this.workflowRunRepository.create(notification, command.template, {
        status: WorkflowRunStatusEnum.PROCESSING,
        deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.PENDING,
        userId: command.userId,
        externalSubscriberId: command.subscriber.subscriberId,
      });

      const isTracesWriteEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_TRACES_WRITE_ENABLED,
        organization: { _id: command.organizationId },
        environment: { _id: command.environmentId },
        user: { _id: command.userId },
        defaultValue: false,
      });

      if (isTracesWriteEnabled) {
        const workflowRunIdentifier =
          command.template.triggers?.[0]?.identifier || command.template.name.toLowerCase().replace(/\s+/g, '_');

        const baseTraceData: Omit<WorkflowRunTraceInput, 'event_type' | 'title'> = {
          created_at: LogRepository.formatDateTime64(new Date()),
          organization_id: command.organizationId,
          environment_id: command.environmentId,
          user_id: command.userId,
          external_subscriber_id: command.subscriber.subscriberId,
          subscriber_id: notification._subscriberId,
          entity_id: notification._id,
          workflow_run_identifier: workflowRunIdentifier,
          workflow_id: notification._templateId,
          workflow_name: command.template.name,
          transaction_id: notification.transactionId,
          channels: JSON.stringify(notification.channels || []),
          subscriber_to: notification.to ? JSON.stringify(notification.to) : '',
          payload: notification.payload ? JSON.stringify(notification.payload) : '',
          control_values: notification.controls ? JSON.stringify(notification.controls) : '',
          topics: notification.topics ? JSON.stringify(notification.topics) : '',
          is_digest: !!notification._digestedNotificationId,
          digested_workflow_run_id: notification._digestedNotificationId || '',
          provider_id: '',
          delivery_lifecycle_status: '',
          delivery_lifecycle_detail: '',
          message: '',
          raw_data: '',
          status: '',
          severity: notification.severity || SeverityLevelEnum.NONE,
          critical: notification.critical || false,
          context_keys: notification.contextKeys,
        };

        await this.traceLogRepository.createWorkflowRun([
          {
            ...baseTraceData,
            event_type: 'workflow_run_status_processing',
            title: 'Workflow run processing',
          },
          {
            ...baseTraceData,
            event_type: 'workflow_run_delivery_pending',
            title: 'Workflow run pending',
          },
        ]);
      }
    } catch (error) {
      console.error(
        { error: error instanceof Error ? error.message : 'Unknown error', notificationId: notification._id },
        'Failed to create workflow run'
      );
      // Don't throw here as we don't want to fail the main notification creation
    }
  }

  private buildJobFromStep(step, command: CreateNotificationJobsCommand, notification): NotificationJob {
    const channel = STEP_TYPE_TO_CHANNEL_TYPE.get(step.template.type);
    const providerId = command.templateProviderIds[channel];

    return {
      identifier: command.identifier,
      payload: command.payload,
      overrides: command.overrides,
      tenant: command.tenant,
      step: this.buildStepForJob(step, command),
      transactionId: command.transactionId,
      _notificationId: notification._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _userId: command.userId,
      subscriberId: command.subscriber.subscriberId,
      _subscriberId: command.subscriber._id,
      status: JobStatusEnum.PENDING,
      _templateId: notification._templateId,
      digest: this.buildStepMetadata(step, command),
      type: step.template.type,
      providerId,
      ...this.overloadActorData(command),
      preferences: command.preferences,
      contextKeys: command.contextKeys,
    };
  }

  private buildStepMetadata(
    step: NotificationStepEntity,
    command: CreateNotificationJobsCommand
  ): IWorkflowStepMetadata {
    if (this.isIDigestBaseMetadata(step.metadata)) {
      const digestValue = this.buildDigestValue(step.metadata, command) || 'No-Value-Provided';
      const digestKey = step.metadata.digestKey || 'No-Key-Provided';

      return { ...step.metadata, digestValue, digestKey };
    }

    return step.metadata;
  }
  private isIDigestBaseMetadata(obj: unknown): obj is IDigestBaseMetadata {
    if (typeof obj !== 'object' || obj === null) return false;

    const typedObj = obj as Partial<IDigestBaseMetadata>;

    return (
      (typedObj.digestKey === undefined || typeof typedObj.digestKey === 'string') &&
      (typedObj.digestValue === undefined || typeof typedObj.digestValue === 'string')
    );
  }

  private buildDigestValue(metadata: IDigestBaseMetadata, command: CreateNotificationJobsCommand): string | undefined {
    if (metadata.digestValue) {
      return metadata.digestValue;
    }
    if (metadata.digestKey) {
      return getNestedValue(command.payload, metadata.digestKey);
    }

    return undefined;
  }

  private overloadActorData(command: CreateNotificationJobsCommand) {
    if (command.actor) {
      return {
        _actorId: command.actor?._id,
        actorId: command.actor?.subscriberId,
      };
    }

    return {};
  }

  private buildStepForJob(step, command: CreateNotificationJobsCommand) {
    return {
      ...step,
      ...(command.bridgeUrl ? { bridgeUrl: command.bridgeUrl } : {}),
    };
  }

  private createATriggerJobIfMissing(
    steps: NotificationStepEntity[],
    command: CreateNotificationJobsCommand,
    notification: NotificationEntity
  ): NotificationJob | undefined {
    const triggerStepExist = steps.some((step) => step.template.type === StepTypeEnum.TRIGGER);

    if (triggerStepExist) {
      return undefined;
    }

    return {
      identifier: command.identifier,
      payload: command.payload,
      overrides: command.overrides,
      tenant: command.tenant,
      step: {
        bridgeUrl: command.bridgeUrl,
        template: {
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
          _creatorId: command.userId,
          _layoutId: null,
          type: StepTypeEnum.TRIGGER,
          content: '',
        },
        _templateId: notification._templateId,
      },
      type: StepTypeEnum.TRIGGER,
      _notificationId: notification._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _userId: command.userId,
      _subscriberId: command.subscriber._id,
      _templateId: notification._templateId,
      subscriberId: command.subscriber.subscriberId,
      transactionId: command.transactionId,
      status: JobStatusEnum.PENDING,
      ...(command.actor && {
        _actorId: command.actor?._id,
        actorId: command.actor?.subscriberId,
      }),
      contextKeys: command.contextKeys,
    };
  }

  private async createSteps(
    command: CreateNotificationJobsCommand,
    activeSteps: NotificationStepEntity[],
    notification: NotificationEntity
  ): Promise<NotificationStepEntity[]> {
    return await this.filterDigestSteps(command, notification, activeSteps);
  }

  private filterActiveSteps(steps: NotificationStepEntity[]): NotificationStepEntity[] {
    return steps.filter((step) => step.active === true);
  }

  private async filterDigestSteps(
    command: CreateNotificationJobsCommand,
    notification: NotificationEntity,
    steps: NotificationStepEntity[]
  ): Promise<NotificationStepEntity[]> {
    // TODO: Review this for workflows with more than one digest as this will return the first element found
    const digestStep = steps.find((step) => step.template?.type === StepTypeEnum.DIGEST);

    if (digestStep?.metadata && 'type' in digestStep.metadata) {
      return await this.digestFilterSteps.execute(
        DigestFilterStepsCommand.create({
          _subscriberId: command.subscriber._id,
          payload: command.payload,
          steps: command.template.steps,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          templateId: command.template._id,
          notificationId: notification._id,
          transactionId: command.transactionId,
          type: digestStep.metadata.type as DigestTypeEnum, // We already checked it is a DIGEST
          backoff: 'backoff' in digestStep.metadata ? digestStep.metadata.backoff : undefined,
        })
      );
    }

    return steps;
  }
}

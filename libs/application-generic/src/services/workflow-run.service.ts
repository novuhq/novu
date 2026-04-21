import { Injectable } from '@nestjs/common';
import {
  JobEntity,
  JobRepository,
  JobStatusEnum,
  MessageEntity,
  MessageRepository,
  NotificationRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
} from '@novu/dal';
import {
  DeliveryLifecycleDetail,
  DeliveryLifecycleEventType,
  DeliveryLifecycleStatusEnum,
  FeatureFlagsKeysEnum,
  SeverityLevelEnum,
} from '@novu/shared';
import { PinoLogger } from '../logging';
import {
  EventType,
  TraceLogRepository,
  WorkflowRunRepository,
  WorkflowRunStatusEnum,
  WorkflowRunTraceInput,
} from './analytic-logs';
import { LogRepository } from './analytic-logs/log.repository';
import { FeatureFlagsService } from './feature-flags';

const DELIVERY_STATUS_TO_EVENT: Record<DeliveryLifecycleStatusEnum, DeliveryLifecycleEventType> = {
  [DeliveryLifecycleStatusEnum.PENDING]: 'workflow_run_delivery_pending',
  [DeliveryLifecycleStatusEnum.SENT]: 'workflow_run_delivery_sent',
  [DeliveryLifecycleStatusEnum.ERRORED]: 'workflow_run_delivery_errored',
  [DeliveryLifecycleStatusEnum.SKIPPED]: 'workflow_run_delivery_skipped',
  [DeliveryLifecycleStatusEnum.CANCELED]: 'workflow_run_delivery_canceled',
  [DeliveryLifecycleStatusEnum.MERGED]: 'workflow_run_delivery_merged',
  [DeliveryLifecycleStatusEnum.DELIVERED]: 'workflow_run_delivery_delivered',
  [DeliveryLifecycleStatusEnum.INTERACTED]: 'workflow_run_delivery_interacted',
};

export type WorkflowRunStatusEventType = Extract<EventType, `workflow_run_status_${string}`>;

export type NotificationForTrace = {
  _id: string;
  _templateId: string;
  _organizationId: string;
  _environmentId: string;
  _subscriberId: string;
  transactionId: string;
  channels?: string[];
  to?: { subscriberId?: string } | any;
  payload?: any;
  controls?: any;
  topics?: any[];
  _digestedNotificationId?: string;
  createdAt?: string;
  severity?: string;
  critical?: boolean;
  contextKeys?: string[];
};

export type WorkflowForTrace = {
  name: string;
  triggers?: Array<{ identifier?: string }>;
};

export interface WorkflowStatusUpdateParams {
  workflowStatus: WorkflowRunStatusEnum;
  notificationId: string;
  environmentId: string;
  organizationId: string;
  _subscriberId: string;
  deliveryLifecycleStatus?: DeliveryLifecycleStatusEnum;
  deliveryLifecycleDetail?: DeliveryLifecycleDetail;
  notification?: NotificationForTrace | null;
  currentJob?: Pick<JobEntity, 'type' | '_id'>;
}

type JobResult = Pick<JobEntity, 'type' | 'status' | 'deliveryLifecycleState' | '_id' | '_mergedDigestId'>;
type MessageResult = Pick<
  MessageEntity,
  'seen' | 'read' | 'snoozedUntil' | 'archived' | 'channel' | 'deliveredAt' | '_jobId'
>;

type ProjectionFromPick<T> = {
  [K in keyof T]: 1;
};

const jobResultProjection: ProjectionFromPick<JobResult> = {
  _id: 1,
  type: 1,
  status: 1,
  deliveryLifecycleState: 1,
  _mergedDigestId: 1,
};

const messageResultProjection: ProjectionFromPick<MessageResult> = {
  seen: 1,
  read: 1,
  snoozedUntil: 1,
  archived: 1,
  channel: 1,
  deliveredAt: 1,
  _jobId: 1,
};

const notificationProjection = {
  _id: 1,
  _templateId: 1,
  _organizationId: 1,
  _environmentId: 1,
  _subscriberId: 1,
  transactionId: 1,
  channels: 1,
  to: 1,
  payload: 1,
  controls: 1,
  topics: 1,
  _digestedNotificationId: 1,
  createdAt: 1,
  severity: 1,
  critical: 1,
  contextKeys: 1,
} as const;

const workflowProjection = {
  name: 1,
  triggers: 1,
} as const;

@Injectable()
export class WorkflowRunService {
  constructor(
    private jobRepository: JobRepository,
    private messageRepository: MessageRepository,
    private workflowRunRepository: WorkflowRunRepository,
    private notificationRepository: NotificationRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private traceLogRepository: TraceLogRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async updateDeliveryLifecycle(params: WorkflowStatusUpdateParams): Promise<void> {
    const isTransitionEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_DELIVERY_LIFECYCLE_TRANSITION_ENABLED,
      organization: { _id: params.organizationId },
      environment: { _id: params.environmentId },
      user: { _id: null },
      defaultValue: false,
    });

    if (isTransitionEnabled) {
      return this.updateDeliveryLifecycleWithTransition(params);
    }

    return this.updateDeliveryLifecycleLegacy(params);
  }

  private async updateDeliveryLifecycleWithTransition({
    notificationId,
    environmentId,
    organizationId,
    _subscriberId,
    workflowStatus,
    deliveryLifecycleStatus: providedStatus,
    deliveryLifecycleDetail: providedDetail,
    notification: passedNotification,
    currentJob,
  }: WorkflowStatusUpdateParams): Promise<void> {
    try {
      let deliveryLifecycleStatus: DeliveryLifecycleStatusEnum;
      let deliveryLifecycleDetail: DeliveryLifecycleDetail | undefined;

      const [jobs, messages] = await Promise.all([
        this.getJobsForWorkflowRun(notificationId, environmentId, organizationId, _subscriberId),
        this.getMessagesForWorkflowRun(notificationId, environmentId, organizationId, _subscriberId),
      ]);

      if (providedStatus) {
        deliveryLifecycleStatus = providedStatus;
        deliveryLifecycleDetail = providedDetail;
      } else {
        const result = this.buildDeliveryLifecycle(notificationId, jobs, messages);
        deliveryLifecycleStatus = result.deliveryLifecycleStatus;
        deliveryLifecycleDetail = result.deliveryLifecycleDetail;
      }

      if (deliveryLifecycleStatus === DeliveryLifecycleStatusEnum.PENDING) {
        return;
      }

      const isInAppChannel = currentJob?.type === 'in_app';

      const { emittedStatuses, isUpdated } = await this.transitionDeliveryLifecycle({
        notificationId,
        organizationId,
        environmentId,
        targetStatus: deliveryLifecycleStatus,
        isInAppChannel,
      });

      let notification: NotificationForTrace | null = passedNotification ?? null;
      let workflow: Pick<NotificationTemplateEntity, 'name' | 'triggers'> | null = null;

      if (isUpdated) {
        const result = await this.getNotificationAndWorkflow(
          notificationId,
          organizationId,
          environmentId,
          passedNotification,
          null
        );
        notification = result.notification;
        workflow = result.workflow;

        await this.workflowRunRepository.updateWorkflowRunState(
          notificationId,
          workflowStatus,
          {
            organizationId,
            environmentId,
          },
          deliveryLifecycleStatus,
          deliveryLifecycleDetail,
          { notification: notification as never, workflow }
        );

        for (const emittedStatus of emittedStatuses) {
          await this.createDeliveryLifecycleTrace(
            notificationId,
            emittedStatus,
            { organizationId, environmentId },
            emittedStatus === deliveryLifecycleStatus ? deliveryLifecycleDetail : undefined,
            notification,
            workflow
          );
        }

        this.logger.debug(
          {
            notificationId,
            organizationId,
            environmentId,
            deliveryLifecycleStatus,
            deliveryLifecycleDetail,
            emittedStatuses,
          },
          `Updated workflow run delivery lifecycle to ${deliveryLifecycleStatus}${deliveryLifecycleDetail ? ` with reason: ${deliveryLifecycleDetail}` : ''}`
        );
      } else {
        this.logger.trace(
          {
            notificationId,
            organizationId,
            environmentId,
            targetStatus: deliveryLifecycleStatus,
          },
          'Skipped workflow run delivery lifecycle update - already at or past this status'
        );
      }

      if (
        workflowStatus === WorkflowRunStatusEnum.COMPLETED ||
        workflowStatus === WorkflowRunStatusEnum.ERROR ||
        workflowStatus === WorkflowRunStatusEnum.SUCCESS
      ) {
        if (!notification || !workflow) {
          const result = await this.getNotificationAndWorkflow(
            notificationId,
            organizationId,
            environmentId,
            notification,
            workflow
          );
          notification = result.notification;
          workflow = result.workflow;
        }

        const statusToEmit =
          workflowStatus === WorkflowRunStatusEnum.COMPLETED || workflowStatus === WorkflowRunStatusEnum.SUCCESS
            ? ('workflow_run_status_completed' as const)
            : ('workflow_run_status_error' as const);
        await this.createWorkflowStatusTrace(
          notificationId,
          statusToEmit,
          { organizationId, environmentId },
          notification,
          workflow
        );
      }
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          notificationId,
        },
        'Failed to update workflow run delivery lifecycle based on jobs'
      );
    }
  }

  private async updateDeliveryLifecycleLegacy({
    notificationId,
    environmentId,
    organizationId,
    _subscriberId,
    workflowStatus,
    deliveryLifecycleStatus: providedStatus,
    deliveryLifecycleDetail: providedDetail,
    notification: passedNotification,
    currentJob,
  }: WorkflowStatusUpdateParams): Promise<void> {
    try {
      let deliveryLifecycleStatus: DeliveryLifecycleStatusEnum;
      let deliveryLifecycleDetail: DeliveryLifecycleDetail | undefined;
      const isWorkflowComplete =
        workflowStatus === WorkflowRunStatusEnum.COMPLETED || workflowStatus === WorkflowRunStatusEnum.SUCCESS;

      const [jobs, messages] = await Promise.all([
        this.getJobsForWorkflowRun(notificationId, environmentId, organizationId, _subscriberId),
        this.getMessagesForWorkflowRun(notificationId, environmentId, organizationId, _subscriberId),
      ]);

      if (providedStatus) {
        deliveryLifecycleStatus = providedStatus;
        deliveryLifecycleDetail = providedDetail;
      } else {
        const result = this.buildDeliveryLifecycle(notificationId, jobs, messages);
        deliveryLifecycleStatus = result.deliveryLifecycleStatus;
        deliveryLifecycleDetail = result.deliveryLifecycleDetail;
      }

      if (deliveryLifecycleStatus === DeliveryLifecycleStatusEnum.PENDING) {
        return;
      }

      const isInAppChannel = currentJob?.type === 'in_app';

      const { notification, workflow } = await this.getNotificationAndWorkflow(
        notificationId,
        organizationId,
        environmentId,
        passedNotification,
        null
      );

      // Handle in-app transition: SENT -> DELIVERED
      if (isInAppChannel && deliveryLifecycleStatus === DeliveryLifecycleStatusEnum.DELIVERED) {
        // First, try to create SENT trace
        const shouldTraceSent = this.shouldCreateTrace(
          DeliveryLifecycleStatusEnum.SENT,
          jobs,
          messages,
          isWorkflowComplete,
          currentJob
        );

        if (shouldTraceSent) {
          await this.workflowRunRepository.updateWorkflowRunState(
            notificationId,
            workflowStatus,
            {
              organizationId,
              environmentId,
            },
            DeliveryLifecycleStatusEnum.SENT,
            undefined,
            { notification: notification as never, workflow }
          );

          await this.createWorkflowRunTraceUpdate(
            notificationId,
            organizationId,
            environmentId,
            DeliveryLifecycleStatusEnum.SENT,
            notification,
            workflow
          );
        }
      }

      const shouldTrace = this.shouldCreateTrace(
        deliveryLifecycleStatus,
        jobs,
        messages,
        isWorkflowComplete,
        currentJob
      );

      await this.workflowRunRepository.updateWorkflowRunState(
        notificationId,
        workflowStatus,
        {
          organizationId,
          environmentId,
        },
        deliveryLifecycleStatus,
        deliveryLifecycleDetail,
        { notification: notification as never, workflow }
      );

      if (shouldTrace) {
        await this.createWorkflowRunTraceUpdate(
          notificationId,
          organizationId,
          environmentId,
          deliveryLifecycleStatus,
          notification,
          workflow
        );
      }

      if (
        workflowStatus === WorkflowRunStatusEnum.COMPLETED ||
        workflowStatus === WorkflowRunStatusEnum.ERROR ||
        workflowStatus === WorkflowRunStatusEnum.SUCCESS
      ) {
        const statusToEmit =
          workflowStatus === WorkflowRunStatusEnum.COMPLETED || workflowStatus === WorkflowRunStatusEnum.SUCCESS
            ? ('workflow_run_status_completed' as const)
            : ('workflow_run_status_error' as const);
        await this.createWorkflowStatusTrace(
          notificationId,
          statusToEmit,
          { organizationId, environmentId },
          notification,
          workflow
        );
      }

      this.seedDeliveryLifecycleState({
        notificationId,
        organizationId,
        environmentId,
        targetStatus: deliveryLifecycleStatus,
      });

      this.logger.debug(
        {
          notificationId,
          organizationId,
          environmentId,
          deliveryLifecycleStatus,
          deliveryLifecycleDetail,
          shouldTrace,
        },
        `Updated workflow run delivery lifecycle to ${deliveryLifecycleStatus}${deliveryLifecycleDetail ? ` with reason: ${deliveryLifecycleDetail}` : ''}`
      );
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          notificationId,
        },
        'Failed to update workflow run delivery lifecycle based on jobs'
      );
    }
  }

  async getDeliveryLifecycle({
    notificationId,
    environmentId,
    organizationId,
    _subscriberId,
  }: WorkflowStatusUpdateParams): Promise<{
    deliveryLifecycleStatus: DeliveryLifecycleStatusEnum;
    deliveryLifecycleDetail?: DeliveryLifecycleDetail;
  }> {
    try {
      const [jobs, messages] = await Promise.all([
        this.getJobsForWorkflowRun(notificationId, environmentId, organizationId, _subscriberId),
        this.getMessagesForWorkflowRun(notificationId, environmentId, organizationId, _subscriberId),
      ]);

      return this.buildDeliveryLifecycle(notificationId, jobs, messages);
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          notificationId,
        },
        'Failed to get workflow run delivery lifecycle'
      );
    }
  }

  private async createWorkflowRunTraceUpdate(
    notificationId: string,
    organizationId: string,
    environmentId: string,
    deliveryLifecycleStatus: DeliveryLifecycleStatusEnum,
    passedNotification?: NotificationForTrace | null,
    passedWorkflow?: WorkflowForTrace | null
  ): Promise<void> {
    try {
      const isTracesWriteEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_TRACES_WRITE_ENABLED,
        organization: { _id: organizationId },
        environment: { _id: environmentId },
        user: { _id: null },
        defaultValue: false,
      });

      if (!isTracesWriteEnabled) {
        return;
      }

      const { notification, workflow } = await this.getNotificationAndWorkflow(
        notificationId,
        organizationId,
        environmentId,
        passedNotification,
        passedWorkflow
      );

      if (!notification || !workflow) {
        return;
      }

      const traceData: WorkflowRunTraceInput = {
        created_at: LogRepository.formatDateTime64(new Date()),
        organization_id: notification._organizationId,
        environment_id: notification._environmentId,
        user_id: '',
        external_subscriber_id: notification.to?.subscriberId || '',
        subscriber_id: notification._subscriberId,
        event_type: DELIVERY_STATUS_TO_EVENT[deliveryLifecycleStatus],
        title: `Workflow run ${deliveryLifecycleStatus}`,
        entity_id: notification._id,
        workflow_run_identifier: workflow.triggers?.[0]?.identifier || workflow.name.toLowerCase().replace(/\s+/g, '_'),
        workflow_id: notification._templateId,
        workflow_name: workflow.name,
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
        context_keys: notification.contextKeys || [],
      };
      await this.traceLogRepository.createWorkflowRun([traceData]);
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          notificationId,
        },
        'Failed to create workflow run trace update'
      );
    }
  }

  async createWorkflowStatusTrace(
    notificationId: string,
    status: WorkflowRunStatusEventType,
    context: { organizationId: string; environmentId: string; userId?: string },
    passedNotification?: NotificationForTrace | null,
    passedWorkflow?: WorkflowForTrace | null
  ): Promise<void> {
    try {
      const isTracesWriteEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_TRACES_WRITE_ENABLED,
        organization: { _id: context.organizationId },
        environment: { _id: context.environmentId },
        user: { _id: null },
        defaultValue: false,
      });

      if (!isTracesWriteEnabled) {
        return;
      }

      const { notification, workflow } = await this.getNotificationAndWorkflow(
        notificationId,
        context.organizationId,
        context.environmentId,
        passedNotification,
        passedWorkflow
      );

      if (!notification || !workflow) {
        return;
      }

      const traceData: WorkflowRunTraceInput = {
        created_at: LogRepository.formatDateTime64(new Date()),
        organization_id: notification._organizationId,
        environment_id: notification._environmentId,
        user_id: context.userId || '',
        external_subscriber_id: notification.to?.subscriberId || '',
        subscriber_id: notification._subscriberId,
        event_type: status,
        title: `Workflow run ${status.replace('workflow_run_status_', '')}`,
        entity_id: notification._id,
        workflow_run_identifier: workflow.triggers?.[0]?.identifier || workflow.name.toLowerCase().replace(/\s+/g, '_'),
        workflow_id: notification._templateId,
        workflow_name: workflow.name,
        transaction_id: notification.transactionId,
        channels: JSON.stringify(notification.channels || []),
        subscriber_to: notification.to ? JSON.stringify(notification.to) : '',
        payload: notification.payload ? JSON.stringify(notification.payload) : '',
        control_values: notification.controls ? JSON.stringify(notification.controls) : '',
        topics: notification.topics ? JSON.stringify(notification.topics) : '',
        is_digest: !!notification._digestedNotificationId,
        digested_workflow_run_id: notification._digestedNotificationId || '',
        severity: notification.severity || SeverityLevelEnum.NONE,
        critical: notification.critical || false,
        context_keys: notification.contextKeys || [],
        message: '',
        raw_data: '',
        status: '',
        provider_id: '',
        delivery_lifecycle_status: '',
        delivery_lifecycle_detail: '',
      };

      await this.traceLogRepository.createWorkflowRun([traceData]);

      this.logger.debug(
        {
          notificationId,
          status,
          organizationId: context.organizationId,
          environmentId: context.environmentId,
        },
        `Created workflow status trace: ${status}`
      );
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          notificationId,
          status,
        },
        'Failed to create workflow status trace'
      );
    }
  }

  async createDeliveryLifecycleTrace(
    notificationId: string,
    deliveryLifecycleStatus: DeliveryLifecycleStatusEnum,
    context: { organizationId: string; environmentId: string; userId?: string },
    deliveryLifecycleDetail?: DeliveryLifecycleDetail,
    passedNotification?: NotificationForTrace | null,
    passedWorkflow?: WorkflowForTrace | null
  ): Promise<void> {
    try {
      const isTracesWriteEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_TRACES_WRITE_ENABLED,
        organization: { _id: context.organizationId },
        environment: { _id: context.environmentId },
        user: { _id: null },
        defaultValue: false,
      });

      if (!isTracesWriteEnabled) {
        return;
      }

      const { notification, workflow } = await this.getNotificationAndWorkflow(
        notificationId,
        context.organizationId,
        context.environmentId,
        passedNotification,
        passedWorkflow
      );

      if (!notification || !workflow) {
        return;
      }

      const traceData: WorkflowRunTraceInput = {
        created_at: LogRepository.formatDateTime64(new Date()),
        organization_id: notification._organizationId,
        environment_id: notification._environmentId,
        user_id: context.userId || '',
        external_subscriber_id: notification.to?.subscriberId || '',
        subscriber_id: notification._subscriberId,
        event_type: DELIVERY_STATUS_TO_EVENT[deliveryLifecycleStatus],
        title: `Workflow run ${deliveryLifecycleStatus}`,
        message: '',
        raw_data: '',
        status: '',
        entity_id: notification._id,
        workflow_run_identifier: workflow.triggers?.[0]?.identifier || workflow.name.toLowerCase().replace(/\s+/g, '_'),
        workflow_id: notification._templateId,
        provider_id: '',
        workflow_name: workflow.name,
        transaction_id: notification.transactionId,
        channels: JSON.stringify(notification.channels || []),
        subscriber_to: notification.to ? JSON.stringify(notification.to) : '',
        payload: notification.payload ? JSON.stringify(notification.payload) : '',
        control_values: notification.controls ? JSON.stringify(notification.controls) : '',
        topics: notification.topics ? JSON.stringify(notification.topics) : '',
        is_digest: !!notification._digestedNotificationId,
        digested_workflow_run_id: notification._digestedNotificationId || '',
        delivery_lifecycle_status: '',
        delivery_lifecycle_detail: '',
        severity: notification.severity || SeverityLevelEnum.NONE,
        critical: notification.critical || false,
        context_keys: notification.contextKeys || [],
      };

      await this.traceLogRepository.createWorkflowRun([traceData]);

      this.logger.debug(
        {
          notificationId,
          deliveryLifecycleStatus,
          deliveryLifecycleDetail,
          organizationId: context.organizationId,
          environmentId: context.environmentId,
        },
        `Created delivery lifecycle trace: ${deliveryLifecycleStatus}`
      );
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          notificationId,
          deliveryLifecycleStatus,
        },
        'Failed to create delivery lifecycle trace'
      );
    }
  }

  private async getJobsForWorkflowRun(
    notificationId: string,
    environmentId: string,
    organizationId: string,
    _subscriberId: string
  ): Promise<JobResult[]> {
    const jobs = await this.jobRepository.find(
      {
        _notificationId: notificationId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId,
      },
      jobResultProjection,
      {
        limit: 100, // Should be enough for most workflows
        sort: { updatedAt: 1 },
      }
    );

    return jobs;
  }

  private async getMessagesForWorkflowRun(
    notificationId: string,
    environmentId: string,
    organizationId: string,
    _subscriberId: string
  ): Promise<MessageResult[]> {
    const messages = await this.messageRepository.find(
      {
        _notificationId: notificationId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId,
      },
      messageResultProjection,
      {
        limit: 50, // Should be enough for most workflows
        sort: { updatedAt: 1 },
      }
    );

    return messages;
  }

  private async getNotificationAndWorkflow(
    notificationId: string,
    organizationId: string,
    environmentId: string,
    passedNotification?: NotificationForTrace | null,
    passedWorkflow?: Pick<NotificationTemplateEntity, 'name' | 'triggers'> | WorkflowForTrace | null
  ): Promise<{
    notification: NotificationForTrace | null;
    workflow: Pick<NotificationTemplateEntity, 'name' | 'triggers'> | null;
  }> {
    const notification =
      passedNotification ??
      (await this.notificationRepository.findOne(
        {
          _id: notificationId,
          _organizationId: organizationId,
          _environmentId: environmentId,
        },
        notificationProjection
      ));

    if (!notification) {
      return { notification: null, workflow: null };
    }

    const workflow =
      (passedWorkflow as Pick<NotificationTemplateEntity, 'name' | 'triggers'>) ??
      (await this.notificationTemplateRepository.findOne(
        {
          _id: notification._templateId,
          _environmentId: environmentId,
        },
        workflowProjection,
        { readPreference: 'secondaryPreferred' }
      ));

    return { notification, workflow };
  }

  /**
   * Maps workflow run delivery lifecycle based on jobs and messages using priority-based business logic.
   *
   * Priority Order (highest → lowest):
   * 1. INTERACTED - If any message has seen/read/snoozedUntil/archived as true
   * 2. DELIVERED - If any message has been delivered (has deliveredAt) and no interaction found
   * 3. SENT - If any step has COMPLETED status and has a message created for it
   * 4. SKIPPED - If all steps finish processing AND at least one step has SKIPPED status
   *    - Detail Priority: SUBSCRIBER_PREFERENCE > USER_STEP_CONDITION > other details
   * 5. CANCELED - If any step has CANCELED status (only if no SKIPPED found)
   * 6. ERRORED - Workflow Run will not be sent due to failure in all steps
   * 7. MERGED - If all steps are MERGED
   * 8. PENDING - If any step has PENDING, QUEUED, RUNNING, or DELAYED status
   */
  private buildDeliveryLifecycle(
    notificationId: string,
    jobs: JobResult[],
    messages: MessageResult[]
  ): {
    deliveryLifecycleStatus: DeliveryLifecycleStatusEnum;
    deliveryLifecycleDetail?: DeliveryLifecycleDetail;
  } {
    // Filter for channel jobs (exclude non-channel jobs like trigger, delay, digest, custom)
    const channelJobs = jobs.filter((job) => job.type && ['in_app', 'email', 'sms', 'chat', 'push'].includes(job.type));

    const logResolution = (status: DeliveryLifecycleStatusEnum, extra?: Record<string, unknown>) => {
      this.logger.info(
        {
          notificationId,
          resolvedStatus: status,
          channelJobStatuses: channelJobs.map((j) => ({ id: j._id, status: j.status })),
          messageCount: messages.length,
          ...extra,
        },
        'Delivery lifecycle resolved'
      );
    };

    if (channelJobs.length === 0) {
      logResolution(DeliveryLifecycleStatusEnum.ERRORED, {
        detail: DeliveryLifecycleDetail.WORKFLOW_MISSING_CHANNEL_STEP,
      });

      return {
        deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.ERRORED,
        deliveryLifecycleDetail: DeliveryLifecycleDetail.WORKFLOW_MISSING_CHANNEL_STEP,
      };
    }

    // Priority 1: INTERACTED - If any message has seen/read/snoozedUntil/archived as true
    const hasInteractedMessage = messages.some(
      (message) => message.seen || message.read || message.snoozedUntil || message.archived
    );

    if (hasInteractedMessage) {
      logResolution(DeliveryLifecycleStatusEnum.INTERACTED);

      return { deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.INTERACTED };
    }

    // Priority 2: DELIVERED - If any message has been delivered (has deliveredAt) and no interaction found
    if (messages.some((message) => !!message.deliveredAt)) {
      logResolution(DeliveryLifecycleStatusEnum.DELIVERED);

      return { deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.DELIVERED };
    }

    // Priority 3: SENT - If any step is COMPLETED and has a message created for it
    const messageSent = channelJobs.some((job) => {
      if (job.status !== JobStatusEnum.COMPLETED) return false;
      return messages.some((message) => message._jobId === job._id);
    });
    if (messageSent) {
      logResolution(DeliveryLifecycleStatusEnum.SENT);

      return { deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.SENT };
    }

    // Priority 4: SKIPPED - Only when all steps finish processing AND at least one job is SKIPPED
    const finishedStatuses = [
      JobStatusEnum.COMPLETED,
      JobStatusEnum.FAILED,
      JobStatusEnum.CANCELED,
      JobStatusEnum.MERGED,
      JobStatusEnum.SKIPPED,
    ];
    const allStepsFinished = channelJobs.every((job) => finishedStatuses.includes(job.status));
    const skippedJobs = channelJobs.filter(
      (job) =>
        job.deliveryLifecycleState?.status && job.deliveryLifecycleState.status === 'skipped' && !job._mergedDigestId
    );

    if (allStepsFinished && skippedJobs.length > 0) {
      // Priority order for delivery lifecycle details (highest → lowest):
      // 1. SUBSCRIBER_PREFERENCE - User preference settings
      // 2. USER_STEP_CONDITION - Step condition evaluation
      // 3. All other details (missing credentials, phone, email, etc.)
      const priorityOrder = [
        DeliveryLifecycleDetail.SUBSCRIBER_PREFERENCE,
        DeliveryLifecycleDetail.USER_STEP_CONDITION,
        DeliveryLifecycleDetail.USER_MISSING_EMAIL,
        DeliveryLifecycleDetail.USER_MISSING_PHONE,
        DeliveryLifecycleDetail.USER_MISSING_PUSH_TOKEN,
        DeliveryLifecycleDetail.USER_MISSING_WEBHOOK_URL,
        DeliveryLifecycleDetail.USER_MISSING_CREDENTIALS,
      ];

      // Find the highest priority detail among skipped jobs
      let selectedDetail: DeliveryLifecycleDetail | undefined;
      for (const detail of priorityOrder) {
        const jobWithDetail = skippedJobs.find((job) => job.deliveryLifecycleState?.detail === detail);
        if (jobWithDetail) {
          selectedDetail = detail;
          break;
        }
      }

      // Fallback to first skipped job's detail if no prioritized detail found
      if (!selectedDetail) {
        selectedDetail = skippedJobs[0].deliveryLifecycleState?.detail;
      }

      logResolution(DeliveryLifecycleStatusEnum.SKIPPED, { detail: selectedDetail });

      return {
        deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.SKIPPED,
        deliveryLifecycleDetail: selectedDetail,
      };
    }

    // Priority 5: CANCELED - Any job with CANCELED status (only if no SKIPPED found)
    const hasUserCanceled = channelJobs.some(
      (job) => isJobCancelled(job) || job.deliveryLifecycleState?.status === DeliveryLifecycleStatusEnum.CANCELED
    );
    if (hasUserCanceled) {
      logResolution(DeliveryLifecycleStatusEnum.CANCELED);

      return { deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.CANCELED };
    }

    // Priority 6: ERRORED - If all steps have failed
    const allStepsFailed = channelJobs.every((job) => job.status === JobStatusEnum.FAILED);

    if (allStepsFailed) {
      logResolution(DeliveryLifecycleStatusEnum.ERRORED);

      return { deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.ERRORED };
    }

    // Priority 7: MERGED - If all steps are merged or skipped with _mergedDigestId
    const allStepsMerged = channelJobs.every(
      (job) => job.status === JobStatusEnum.MERGED || (job.status === JobStatusEnum.SKIPPED && !!job._mergedDigestId)
    );
    if (allStepsMerged) {
      logResolution(DeliveryLifecycleStatusEnum.MERGED);

      return { deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.MERGED };
    }

    // Priority 8: PENDING - If any step is still in-flight (pending, queued, running, delayed)
    const hasPendingSteps = channelJobs.some(
      (job) =>
        job.status === JobStatusEnum.PENDING ||
        job.status === JobStatusEnum.QUEUED ||
        job.status === JobStatusEnum.RUNNING ||
        job.status === JobStatusEnum.DELAYED
    );
    if (hasPendingSteps) {
      logResolution(DeliveryLifecycleStatusEnum.PENDING);

      return { deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.PENDING };
    }

    this.logger.warn(
      {
        notificationId,
        channelJobStatuses: channelJobs.map((job) => ({
          id: job._id,
          status: job.status,
          type: job.type,
        })),
        messageJobIds: messages.map((m) => m._jobId),
      },
      'No matching delivery lifecycle found for jobs, falling back to ERRORED'
    );

    return {
      deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.ERRORED,
      deliveryLifecycleDetail: DeliveryLifecycleDetail.UNKNOWN_ERROR,
    };
  }

  /**
   * Determines whether a trace should be created for the given delivery lifecycle status.
   * This method prevents duplicate traces by ensuring each status is only traced once per workflow run.
   *
   * @param currentJob - Present during job execution, undefined for webhooks/external triggers.
   *                     Used to identify which job triggered the status update.
   */
  private shouldCreateTrace(
    deliveryLifecycleStatus: DeliveryLifecycleStatusEnum,
    jobs: JobResult[],
    messages: MessageResult[],
    isWorkflowComplete: boolean,
    currentJob?: Pick<JobEntity, 'type' | '_id'>
  ): boolean {
    const terminalStatuses = [
      DeliveryLifecycleStatusEnum.SKIPPED,
      DeliveryLifecycleStatusEnum.CANCELED,
      DeliveryLifecycleStatusEnum.ERRORED,
      DeliveryLifecycleStatusEnum.MERGED,
    ];

    if (terminalStatuses.includes(deliveryLifecycleStatus)) {
      return isWorkflowComplete;
    }

    const channelJobs = jobs.filter((job) => job.type && ['in_app', 'email', 'sms', 'chat', 'push'].includes(job.type));

    switch (deliveryLifecycleStatus) {
      case DeliveryLifecycleStatusEnum.SENT: {
        const completedWithMessage = channelJobs.filter(
          (job) => job.status === JobStatusEnum.COMPLETED && messages.some((m) => m._jobId === job._id)
        );

        if (completedWithMessage.length === 0) {
          return false;
        }

        if (!currentJob) {
          return false;
        }

        // Only create trace if this is the first job completing with a message
        // This prevents duplicate SENT traces in workflows like email -> email
        const isCurrentJobInCompleted = completedWithMessage.some((job) => job._id === currentJob._id);

        return isCurrentJobInCompleted && completedWithMessage.length === 1;
      }
      case DeliveryLifecycleStatusEnum.DELIVERED: {
        const deliveredMessages = messages.filter((m) => !!m.deliveredAt);

        if (deliveredMessages.length === 0) {
          return false;
        }

        const jobsWithDeliveredMessages = channelJobs.filter((job) =>
          deliveredMessages.some((m) => m._jobId === job._id)
        );

        if (currentJob) {
          const isCurrentJobDelivered = deliveredMessages.some((m) => m._jobId === currentJob._id);

          return isCurrentJobDelivered && jobsWithDeliveredMessages.length === 1;
        }

        return jobsWithDeliveredMessages.length === 1;
      }
      case DeliveryLifecycleStatusEnum.INTERACTED: {
        const interactedMessages = messages.filter((m) => m.seen || m.read || m.snoozedUntil || m.archived);

        return interactedMessages.length >= 1;
      }
      default:
        return true;
    }
  }

  private async seedDeliveryLifecycleState(params: {
    notificationId: string;
    organizationId: string;
    environmentId: string;
    targetStatus: DeliveryLifecycleStatusEnum;
  }): Promise<void> {
    const targetEvent = DELIVERY_STATUS_TO_EVENT[params.targetStatus];
    try {
      await this.notificationRepository.tryDeliveryLifecycleTransition(
        params.notificationId,
        params.organizationId,
        params.environmentId,
        targetEvent
      );
    } catch (error) {
      this.logger.trace(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          notificationId: params.notificationId,
          targetEvent,
        },
        'Shadow seeding delivery lifecycle state failed'
      );
    }
  }

  private async transitionDeliveryLifecycle(params: {
    notificationId: string;
    organizationId: string;
    environmentId: string;
    targetStatus: DeliveryLifecycleStatusEnum;
    isInAppChannel?: boolean;
  }): Promise<{ emittedStatuses: DeliveryLifecycleStatusEnum[]; isUpdated: boolean }> {
    const emittedStatuses: DeliveryLifecycleStatusEnum[] = [];

    // produce synthetic SENT for in_app channel when DELIVERED is reached
    if (params.isInAppChannel && params.targetStatus === DeliveryLifecycleStatusEnum.DELIVERED) {
      const sentResult = await this.tryNotificationDeliveryLifecycleTransition({
        ...params,
        targetEvent: 'workflow_run_delivery_sent',
      });

      if (sentResult.isUpdated) {
        emittedStatuses.push(DeliveryLifecycleStatusEnum.SENT);
        this.logger.debug(
          {
            notificationId: params.notificationId,
            event: 'workflow_run_delivery_sent',
          },
          'Emitted synthetic SENT for in_app channel'
        );
      }
    }

    const result = await this.tryNotificationDeliveryLifecycleTransition({
      ...params,
      targetEvent: DELIVERY_STATUS_TO_EVENT[params.targetStatus],
    });
    if (result.isUpdated) {
      emittedStatuses.push(params.targetStatus);
      this.logger.debug(
        {
          notificationId: params.notificationId,
          event: DELIVERY_STATUS_TO_EVENT[params.targetStatus],
          previousEvent: result.previousEvent,
        },
        'Delivery lifecycle transitioned'
      );
    } else {
      this.logger.trace(
        {
          notificationId: params.notificationId,
          targetEvent: DELIVERY_STATUS_TO_EVENT[params.targetStatus],
          previousEvent: result.previousEvent,
        },
        'Delivery lifecycle transition skipped - already at or past this event'
      );
    }

    return {
      emittedStatuses,
      isUpdated: emittedStatuses.length > 0,
    };
  }

  private async tryNotificationDeliveryLifecycleTransition(params: {
    notificationId: string;
    organizationId: string;
    environmentId: string;
    targetEvent: DeliveryLifecycleEventType;
  }): Promise<{ isUpdated: boolean; previousEvent?: DeliveryLifecycleEventType }> {
    try {
      return await this.notificationRepository.tryDeliveryLifecycleTransition(
        params.notificationId,
        params.organizationId,
        params.environmentId,
        params.targetEvent
      );
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          notificationId: params.notificationId,
          targetEvent: params.targetEvent,
        },
        'Failed to transition delivery lifecycle'
      );

      return { isUpdated: false };
    }
  }
}

// backward compatibility - will be removed once the database is updated with the deliveryLifecycleState field
function isJobCancelled(job: JobResult): boolean {
  return job.status === JobStatusEnum.CANCELED && !job.deliveryLifecycleState?.status;
}

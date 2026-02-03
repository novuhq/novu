import { Injectable } from '@nestjs/common';
import {
  JobEntity,
  JobRepository,
  JobStatusEnum,
  MessageEntity,
  MessageRepository,
  NotificationRepository,
  NotificationTemplateRepository,
} from '@novu/dal';
import {
  DeliveryLifecycleDetail,
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

export interface WorkflowStatusUpdateParams {
  workflowStatus: WorkflowRunStatusEnum;
  notificationId: string;
  environmentId: string;
  organizationId: string;
  _subscriberId: string;
  deliveryLifecycleStatus?: DeliveryLifecycleStatusEnum;
  deliveryLifecycleDetail?: DeliveryLifecycleDetail;
  notification?: NotificationForTrace | null;
}

type JobResult = Pick<JobEntity, 'type' | 'status' | 'deliveryLifecycleState' | '_id'>;
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

  async updateDeliveryLifecycle({
    notificationId,
    environmentId,
    organizationId,
    _subscriberId,
    workflowStatus,
    deliveryLifecycleStatus: providedStatus,
    deliveryLifecycleDetail: providedDetail,
    notification,
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
        const result = this.buildDeliveryLifecycle(jobs, messages);
        deliveryLifecycleStatus = result.deliveryLifecycleStatus;
        deliveryLifecycleDetail = result.deliveryLifecycleDetail;
      }

      if (deliveryLifecycleStatus === DeliveryLifecycleStatusEnum.PENDING) {
        return;
      }

      const shouldTrace = this.shouldCreateTrace(deliveryLifecycleStatus, jobs, messages, isWorkflowComplete);

      await this.workflowRunRepository.updateWorkflowRunState(
        notificationId,
        workflowStatus,
        {
          organizationId,
          environmentId,
        },
        deliveryLifecycleStatus,
        deliveryLifecycleDetail
      );

      if (shouldTrace) {
        await this.createWorkflowRunTraceUpdate(
          notificationId,
          workflowStatus,
          organizationId,
          environmentId,
          deliveryLifecycleStatus,
          deliveryLifecycleDetail,
          notification
        );
      }

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

      return this.buildDeliveryLifecycle(jobs, messages);
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

  private shouldCreateTrace(
    deliveryLifecycleStatus: DeliveryLifecycleStatusEnum,
    jobs: JobResult[],
    messages: MessageResult[],
    isWorkflowComplete: boolean
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

    switch (deliveryLifecycleStatus) {
      case DeliveryLifecycleStatusEnum.SENT: {
        const completedWithMessage = jobs.filter(
          (job) => job.status === JobStatusEnum.COMPLETED && messages.some((m) => m._jobId === job._id)
        );

        return completedWithMessage.length >= 1;
      }
      case DeliveryLifecycleStatusEnum.DELIVERED: {
        const deliveredMessages = messages.filter((m) => !!m.deliveredAt);

        return deliveredMessages.length >= 1;
      }
      case DeliveryLifecycleStatusEnum.INTERACTED: {
        const interactedMessages = messages.filter((m) => m.seen || m.read || m.snoozedUntil || m.archived);

        return interactedMessages.length >= 1;
      }
      default:
        return true;
    }
  }

  private async createWorkflowRunTraceUpdate(
    notificationId: string,
    workflowStatus: WorkflowRunStatusEnum,
    organizationId: string,
    environmentId: string,
    deliveryLifecycleStatus: DeliveryLifecycleStatusEnum,
    deliveryLifecycleDetail?: DeliveryLifecycleDetail,
    passedNotification?: NotificationForTrace | null
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

      const notification =
        passedNotification ??
        (await this.notificationRepository.findOne(
          {
            _id: notificationId,
            _organizationId: organizationId,
            _environmentId: environmentId,
          },
          {
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
          }
        ));

      if (!notification) {
        return;
      }

      const template = await this.notificationTemplateRepository.findOne(
        {
          _id: notification._templateId,
          _environmentId: environmentId,
        },
        {
          name: 1,
          triggers: 1,
        },
        { readPreference: 'secondaryPreferred' }
      );

      if (!template) {
        return;
      }

      const deliveryLifecycleEventTypeMap: Record<DeliveryLifecycleStatusEnum, EventType> = {
        [DeliveryLifecycleStatusEnum.PENDING]: 'workflow_run_delivery_pending',
        [DeliveryLifecycleStatusEnum.SENT]: 'workflow_run_delivery_sent',
        [DeliveryLifecycleStatusEnum.ERRORED]: 'workflow_run_delivery_errored',
        [DeliveryLifecycleStatusEnum.SKIPPED]: 'workflow_run_delivery_skipped',
        [DeliveryLifecycleStatusEnum.CANCELED]: 'workflow_run_delivery_canceled',
        [DeliveryLifecycleStatusEnum.MERGED]: 'workflow_run_delivery_merged',
        [DeliveryLifecycleStatusEnum.DELIVERED]: 'workflow_run_delivery_delivered',
        [DeliveryLifecycleStatusEnum.INTERACTED]: 'workflow_run_delivery_interacted',
      };

      const statusMap: Record<WorkflowRunStatusEnum, WorkflowRunTraceInput['status']> = {
        [WorkflowRunStatusEnum.PROCESSING]: 'pending',
        [WorkflowRunStatusEnum.PENDING]: 'pending',
        [WorkflowRunStatusEnum.COMPLETED]: 'success',
        [WorkflowRunStatusEnum.SUCCESS]: 'success',
        [WorkflowRunStatusEnum.ERROR]: 'error',
      };

      const traceData: WorkflowRunTraceInput = {
        created_at: LogRepository.formatDateTime64(new Date()),
        organization_id: notification._organizationId,
        environment_id: notification._environmentId,
        user_id: '',
        external_subscriber_id: notification.to?.subscriberId || '',
        subscriber_id: notification._subscriberId,
        event_type: deliveryLifecycleEventTypeMap[deliveryLifecycleStatus],
        title: `Workflow run ${deliveryLifecycleStatus}`,
        message: '',
        raw_data: '',
        status: statusMap[workflowStatus],
        entity_id: notification._id,
        workflow_run_identifier: template.triggers?.[0]?.identifier || template.name.toLowerCase().replace(/\s+/g, '_'),
        workflow_id: notification._templateId,
        provider_id: '',
        workflow_name: template.name,
        transaction_id: notification.transactionId,
        channels: JSON.stringify(notification.channels || []),
        subscriber_to: notification.to ? JSON.stringify(notification.to) : '',
        payload: notification.payload ? JSON.stringify(notification.payload) : '',
        control_values: notification.controls ? JSON.stringify(notification.controls) : '',
        topics: notification.topics ? JSON.stringify(notification.topics) : '',
        is_digest: !!notification._digestedNotificationId,
        digested_workflow_run_id: notification._digestedNotificationId || '',
        delivery_lifecycle_status: deliveryLifecycleStatus,
        delivery_lifecycle_detail: deliveryLifecycleDetail || '',
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
    jobs: JobResult[],
    messages: MessageResult[]
  ): {
    deliveryLifecycleStatus: DeliveryLifecycleStatusEnum;
    deliveryLifecycleDetail?: DeliveryLifecycleDetail;
  } {
    // Filter for channel jobs (exclude non-channel jobs like trigger, delay, digest, custom)
    const channelJobs = jobs.filter((job) => job.type && ['in_app', 'email', 'sms', 'chat', 'push'].includes(job.type));

    if (channelJobs.length === 0) {
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
      return { deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.INTERACTED };
    }

    // Priority 2: DELIVERED - If any message has been delivered (has deliveredAt) and no interaction found
    if (messages.some((message) => !!message.deliveredAt)) {
      return { deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.DELIVERED };
    }

    // Priority 3: SENT - If any step is COMPLETED and has a message created for it
    const messageSent = channelJobs.some((job) => {
      if (job.status !== JobStatusEnum.COMPLETED) return false;
      return messages.some((message) => message._jobId === job._id);
    });
    if (messageSent) {
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
      (job) => job.deliveryLifecycleState?.status && job.deliveryLifecycleState.status === 'skipped'
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
      return { deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.CANCELED };
    }

    // Priority 6: ERRORED - If all steps have failed
    const allStepsFailed = channelJobs.every((job) => job.status === JobStatusEnum.FAILED);

    if (allStepsFailed) {
      return { deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.ERRORED };
    }

    // Priority 7: MERGED - If all steps are merged
    const allStepsMerged = channelJobs.every((job) => job.status === JobStatusEnum.MERGED);
    if (allStepsMerged) {
      return { deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.MERGED };
    }

    // Priority 8: PENDING - If any step is pending (pending, queued, delayed)
    const hasPendingSteps = channelJobs.some(
      (job) =>
        job.status === JobStatusEnum.PENDING ||
        job.status === JobStatusEnum.QUEUED ||
        job.status === JobStatusEnum.DELAYED
    );
    if (hasPendingSteps) {
      return { deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.PENDING };
    }

    this.logger.warn(
      {
        jobIds: channelJobs.map((job) => job._id),
        statuses: channelJobs.map((job) => ({
          status: job.status,
          deliveryLifecycleState: job.deliveryLifecycleState,
        })),
      },
      'No matching delivery lifecycle found for jobs, falling back to ERRORED'
    );

    return {
      deliveryLifecycleStatus: DeliveryLifecycleStatusEnum.ERRORED,
      deliveryLifecycleDetail: DeliveryLifecycleDetail.UNKNOWN_ERROR,
    };
  }
}

// backward compatibility - will be removed once the database is updated with the deliveryLifecycleState field
function isJobCancelled(job: JobResult): boolean {
  return job.status === JobStatusEnum.CANCELED && !job.deliveryLifecycleState?.status;
}

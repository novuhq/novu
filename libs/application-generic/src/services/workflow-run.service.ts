import { Injectable } from '@nestjs/common';
import { JobEntity, JobRepository, JobStatusEnum, MessageEntity, MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, DeliveryLifecycleDetail, DeliveryLifecycleStatus } from '@novu/shared';
import { PinoLogger } from '../logging';
import { WorkflowRunRepository, WorkflowRunStatusEnum } from './analytic-logs';

interface WorkflowStatusUpdateParams {
  notificationId: string;
  environmentId: string;
  organizationId: string;
  subscriberId: string;
  error?: unknown;
  deliveryLifecycleStatus?: DeliveryLifecycleStatus;
  deliveryLifecycleDetail?: DeliveryLifecycleDetail;
}

type JobResult = Pick<JobEntity, 'type' | 'status' | 'deliveryLifecycleState' | '_id'>;
type MessageResult = Pick<MessageEntity, 'seen' | 'read' | 'snoozedUntil' | 'archived' | 'channel'>;

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
};

@Injectable()
export class WorkflowRunService {
  constructor(
    private jobRepository: JobRepository,
    private messageRepository: MessageRepository,
    private workflowRunRepository: WorkflowRunRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async updateDeliveryLifecycle({
    notificationId,
    environmentId,
    organizationId,
    subscriberId,
    error,
    deliveryLifecycleStatus: providedStatus,
    deliveryLifecycleDetail: providedDetail,
  }: WorkflowStatusUpdateParams): Promise<void> {
    try {
      let deliveryLifecycleStatus: DeliveryLifecycleStatus;
      let deliveryLifecycleDetail: DeliveryLifecycleDetail | undefined;

      if (providedStatus) {
        deliveryLifecycleStatus = providedStatus;
        deliveryLifecycleDetail = providedDetail;
      } else {
        const result = await this.getDeliveryLifecycle({
          notificationId,
          environmentId,
          organizationId,
          subscriberId,
        });
        deliveryLifecycleStatus = result.deliveryLifecycleStatus;
        deliveryLifecycleDetail = result.deliveryLifecycleDetail;
      }

      await this.workflowRunRepository.updateWorkflowRunState(
        notificationId,
        error ? WorkflowRunStatusEnum.ERROR : WorkflowRunStatusEnum.COMPLETED,
        {
          organizationId,
          environmentId,
        },
        deliveryLifecycleStatus,
        deliveryLifecycleDetail
      );

      this.logger.debug(
        {
          notificationId,
          organizationId,
          environmentId,
          deliveryLifecycleStatus,
          deliveryLifecycleDetail,
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
    subscriberId,
  }: WorkflowStatusUpdateParams): Promise<{
    deliveryLifecycleStatus: DeliveryLifecycleStatus;
    deliveryLifecycleDetail?: DeliveryLifecycleDetail;
  }> {
    try {
      const [jobs, messages] = await Promise.all([
        this.getJobsForWorkflowRun(notificationId, environmentId, organizationId, subscriberId),
        this.getMessagesForWorkflowRun(notificationId, environmentId, organizationId, subscriberId),
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

  private async getJobsForWorkflowRun(
    workflowRunId: string,
    environmentId: string,
    organizationId: string,
    subscriberId: string
  ): Promise<JobResult[]> {
    const jobs = await this.jobRepository.find(
      {
        _notificationId: workflowRunId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId: subscriberId,
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
    workflowRunId: string,
    environmentId: string,
    organizationId: string,
    subscriberId: string
  ): Promise<MessageResult[]> {
    const messages = await this.messageRepository.find(
      {
        _notificationId: workflowRunId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId: subscriberId,
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
   * 2. DELIVERED - If any in-app message exists and no interaction found
   * 3. SENT - If any step has COMPLETED status, workflow delivery is considered SENT
   * 4. SKIPPED - If any step has SKIPPED status OR statusReason starting with "skipped"
   *    - Detail Priority: SUBSCRIBER_PREFERENCE > USER_STEP_CONDITION > other details
   * 5. CANCELED - If any step has CANCELED status (only if no SKIPPED found)
   * 6. ERRORED - If any step has FAILED status
   * 7. MERGED - If all steps are MERGED
   */
  private buildDeliveryLifecycle(
    jobs: JobResult[],
    messages: MessageResult[]
  ): {
    deliveryLifecycleStatus: DeliveryLifecycleStatus;
    deliveryLifecycleDetail?: DeliveryLifecycleDetail;
  } {
    // Filter for channel jobs (exclude non-channel jobs like trigger, delay, digest, custom)
    const channelJobs = jobs.filter((job) => job.type && ['in_app', 'email', 'sms', 'chat', 'push'].includes(job.type));

    if (channelJobs.length === 0) {
      return {
        deliveryLifecycleStatus: DeliveryLifecycleStatus.ERRORED,
        deliveryLifecycleDetail: DeliveryLifecycleDetail.WORKFLOW_MISSING_CHANNEL_STEP,
      };
    }

    // Priority 1: INTERACTED - If any message has seen/read/snoozedUntil/archived as true
    const hasInteractedMessage = messages.some(
      (message) => message.seen || message.read || message.snoozedUntil || message.archived
    );
    if (hasInteractedMessage) {
      return { deliveryLifecycleStatus: DeliveryLifecycleStatus.INTERACTED };
    }

    // Priority 2: DELIVERED - If any in-app message exists and no interaction found
    const hasInAppMessage = messages.some((message) => message.channel === ChannelTypeEnum.IN_APP);
    if (hasInAppMessage) {
      return { deliveryLifecycleStatus: DeliveryLifecycleStatus.DELIVERED };
    }

    // Priority 3: SENT - If any step is COMPLETED, workflow delivery lifecycle is SENT
    const hasCompletedSteps = channelJobs.some((job) => job.status === JobStatusEnum.COMPLETED);
    if (hasCompletedSteps) {
      return { deliveryLifecycleStatus: DeliveryLifecycleStatus.SENT };
    }

    // Priority 4: SKIPPED - Any job with SKIPPED status OR delivery lifecycle status is "skipped"
    const skippedJobs = channelJobs.filter(
      (job) =>
        job.status === JobStatusEnum.SKIPPED ||
        (job.deliveryLifecycleState?.status && job.deliveryLifecycleState.status === 'skipped')
    );
    if (skippedJobs.length > 0) {
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
        deliveryLifecycleStatus: DeliveryLifecycleStatus.SKIPPED,
        deliveryLifecycleDetail: selectedDetail,
      };
    }

    // Priority 5: CANCELED - Any job with CANCELED status (only if no SKIPPED found)
    const hasUserCanceled = channelJobs.some((job) => job.status === JobStatusEnum.CANCELED);
    if (hasUserCanceled) {
      return { deliveryLifecycleStatus: DeliveryLifecycleStatus.CANCELED };
    }

    // Priority 6: ERRORED - If any step has failed
    const hasFailedSteps = channelJobs.some((job) => job.status === JobStatusEnum.FAILED);
    if (hasFailedSteps) {
      return { deliveryLifecycleStatus: DeliveryLifecycleStatus.ERRORED };
    }

    // Priority 7: MERGED - If all steps are merged
    const allStepsMerged = channelJobs.every((job) => job.status === JobStatusEnum.MERGED);
    if (allStepsMerged) {
      return { deliveryLifecycleStatus: DeliveryLifecycleStatus.MERGED };
    }

    // Default fallback - if no clear status can be determined
    this.logger.warn(
      {
        jobIds: channelJobs.map((job) => job._id),
        statuses: channelJobs.map((job) => ({
          status: job.status,
          deliveryLifecycleState: job.deliveryLifecycleState,
        })),
      },
      'WorkflowRunDeliveryLifecycle: No matching delivery lifecycle found for jobs, falling back to ERRORED'
    );

    return { deliveryLifecycleStatus: DeliveryLifecycleStatus.ERRORED };
  }
}

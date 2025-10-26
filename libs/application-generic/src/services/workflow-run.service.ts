import { Injectable } from '@nestjs/common';
import { JobEntity, JobRepository, JobStatusEnum, MessageEntity, MessageRepository } from '@novu/dal';
import { DeliveryLifecycleDetail, DeliveryLifecycleStatusEnum } from '@novu/shared';
import { PinoLogger } from '../logging';
import { WorkflowRunRepository, WorkflowRunStatusEnum } from './analytic-logs';

interface WorkflowStatusUpdateParams {
  workflowStatus: WorkflowRunStatusEnum;
  notificationId: string;
  environmentId: string;
  organizationId: string;
  _subscriberId: string;
  deliveryLifecycleStatus?: DeliveryLifecycleStatusEnum;
  deliveryLifecycleDetail?: DeliveryLifecycleDetail;
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
  }: WorkflowStatusUpdateParams): Promise<void> {
    try {
      let deliveryLifecycleStatus: DeliveryLifecycleStatusEnum;
      let deliveryLifecycleDetail: DeliveryLifecycleDetail | undefined;

      if (providedStatus) {
        deliveryLifecycleStatus = providedStatus;
        deliveryLifecycleDetail = providedDetail;
      } else {
        const result = await this.getDeliveryLifecycle({
          workflowStatus,
          notificationId,
          environmentId,
          organizationId,
          _subscriberId,
        });
        deliveryLifecycleStatus = result.deliveryLifecycleStatus;
        deliveryLifecycleDetail = result.deliveryLifecycleDetail;
      }

      if (deliveryLifecycleStatus === DeliveryLifecycleStatusEnum.PENDING) {
        // Optimization: Skip workflow run updates when delivery lifecycle is pending
        // since the workflow run should already be in the expected pending state
        return;
      }

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

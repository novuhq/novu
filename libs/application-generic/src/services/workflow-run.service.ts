import { Injectable } from '@nestjs/common';
import { JobEntity, JobRepository, JobStatusEnum, MessageEntity, MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, DeliveryLifecycleDetail, DeliveryLifecycleStatus } from '@novu/shared';
import { WorkflowRunRepository, WorkflowRunStatusEnum } from './analytic-logs';
import { PinoLogger } from '../logging';

interface WorkflowStatusUpdateParams {
  notificationId: string;
  environmentId: string;
  organizationId: string;
  subscriberId: string;
  error?: unknown;
}

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
  }: WorkflowStatusUpdateParams): Promise<void> {
    try {
      const { deliveryLifecycleStatus, deliveryLifecycleDetail } = await this.getDeliveryLifecycle({
        notificationId,
        environmentId,
        organizationId,
        subscriberId,
      });
      await this.workflowRunRepository.updateWorkflowRunState(notificationId, error ? WorkflowRunStatusEnum.ERROR : WorkflowRunStatusEnum.COMPLETED, {
        organizationId,
        environmentId,
      }, deliveryLifecycleStatus, deliveryLifecycleDetail);

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
        this.getMessagesForWorkflowRun(notificationId, environmentId, organizationId, subscriberId)
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
  ) {
    const jobs = await this.jobRepository.find(
      {
        _notificationId: workflowRunId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId: subscriberId,
      },
      undefined,
      {
        limit: 50, // Should be enough for most workflows
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
  ): Promise<MessageEntity[]> {
    const messages = await this.messageRepository.find(
      {
        _notificationId: workflowRunId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId: subscriberId,
      },
      undefined,
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
   * 5. CANCELED - If any step has CANCELED status (only if no SKIPPED found)
   * 6. ERRORED - If any step has FAILED status
   * 7. MERGED - If all steps are MERGED
   */
  private buildDeliveryLifecycle(jobs: JobEntity[], messages: MessageEntity[]): {
    deliveryLifecycleStatus: DeliveryLifecycleStatus;
    deliveryLifecycleDetail?: DeliveryLifecycleDetail;
  } {
    // Filter for channel steps (exclude non-channel steps like trigger, delay, digest, custom)
    const channelSteps = jobs.filter(
      (job) => job.type && ['in_app', 'email', 'sms', 'chat', 'push'].includes(job.type)
    );

    if (channelSteps.length === 0) {
      return { deliveryLifecycleStatus: DeliveryLifecycleStatus.ERRORED, deliveryLifecycleDetail: DeliveryLifecycleDetail.WORKFLOW_MISSING_CHANNEL_STEP };
    }

    // Priority 1: INTERACTED - If any message has seen/read/snoozedUntil/archived as true
    const hasInteractedMessage = messages.some((message) => 
      message.seen || message.read || message.snoozedUntil || message.archived
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
    const hasCompletedSteps = channelSteps.some((job) => job.status === JobStatusEnum.COMPLETED);
    if (hasCompletedSteps) {
      return { deliveryLifecycleStatus: DeliveryLifecycleStatus.SENT };
    }

    // Priority 4: SKIPPED - Any job with SKIPPED status OR delivery lifecycle status is "skipped"
    const skippedJob = channelSteps.find(
      (job) => job.status === JobStatusEnum.SKIPPED ||
        (job.deliveryLifecycleState?.status && job.deliveryLifecycleState.status === 'skipped')
    );
    if (skippedJob) {
      return {
        deliveryLifecycleStatus: DeliveryLifecycleStatus.SKIPPED,
        deliveryLifecycleDetail: skippedJob.deliveryLifecycleState?.detail
      };
    }

    // Priority 5: CANCELED - Any job with CANCELED status (only if no SKIPPED found)
    const hasUserCanceled = channelSteps.some((job) => job.status === JobStatusEnum.CANCELED);
    if (hasUserCanceled) {
      return { deliveryLifecycleStatus: DeliveryLifecycleStatus.CANCELED };
    }

    // Priority 6: ERRORED - If any step has failed
    const hasFailedSteps = channelSteps.some((job) => job.status === JobStatusEnum.FAILED);
    if (hasFailedSteps) {
      return { deliveryLifecycleStatus: DeliveryLifecycleStatus.ERRORED };
    }

    // Priority 7: MERGED - If all steps are merged
    const allStepsMerged = channelSteps.every((job) => job.status === JobStatusEnum.MERGED);
    if (allStepsMerged) {
      return { deliveryLifecycleStatus: DeliveryLifecycleStatus.MERGED };
    }



    // Default fallback - if no clear status can be determined
    this.logger.warn(
      {
        jobIds: channelSteps.map((job) => job._id),
        statuses: channelSteps.map((job) => ({ status: job.status, deliveryLifecycleState: job.deliveryLifecycleState })),
      },
      'WorkflowRunDeliveryLifecycle: No matching delivery lifecycle found for jobs, falling back to ERRORED'
    );

    return { deliveryLifecycleStatus: DeliveryLifecycleStatus.ERRORED };
  }
}

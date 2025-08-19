import { Injectable } from '@nestjs/common';
import { DeliveryLifecycleEnum, PinoLogger, WorkflowRunRepository, WorkflowRunStatusEnum } from '@novu/application-generic';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { DeliveryLifecycleDetail } from '@novu/shared';

interface WorkflowStatusUpdateParams {
  notificationId: string;
  environmentId: string;
  organizationId: string;
  subscriberId: string;
}

@Injectable()
export class WorkflowRunService {
  constructor(
    private jobRepository: JobRepository,
    private workflowRunRepository: WorkflowRunRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Updates the workflow run delivery lifecycle based on jobs using priority-based business logic
   */
  async updateDeliveryLifecycle({
    notificationId,
    environmentId,
    organizationId,
    subscriberId,
  }: WorkflowStatusUpdateParams): Promise<void> {
    try {
      const jobs = await this.getJobsForWorkflowRun(notificationId, environmentId, organizationId, subscriberId);
      const { deliveryLifecycleStatus, deliveryLifecycleDetail } = this.buildDeliveryLifecycle(jobs);
      await this.workflowRunRepository.updateWorkflowRunState(notificationId, WorkflowRunStatusEnum.SUCCESS, {
        organizationId,
        environmentId,
      }, deliveryLifecycleStatus, deliveryLifecycleDetail);

      this.logger.debug(
        {
          notificationId,
          organizationId,
          environmentId,
          jobsCount: jobs.length,
          deliveryLifecycleStatus,
          deliveryLifecycleDetail,
        },
        `Updated workflow run delivery lifecycle to ${deliveryLifecycleStatus}${deliveryLifecycleDetail ? ` with reason: ${deliveryLifecycleDetail}` : ''} based on ${jobs.length} jobs`
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

  /**
   * Maps workflow run delivery lifecycle based on jobs using priority-based business logic.
   * 
   * Priority Order (highest → lowest):
   * 1. SENT - If any step has COMPLETED status, workflow delivery is considered SENT
   * 2. SKIPPED - If any step has SKIPPED status OR statusReason starting with "skipped"
   * 3. CANCELED - If any step has CANCELED status (only if no SKIPPED found)
   * 4. ERRORED - If any step has FAILED status
   * 5. MERGED - If all steps are MERGED
   */
  private buildDeliveryLifecycle(jobs: JobEntity[]): {
    deliveryLifecycleStatus: DeliveryLifecycleEnum;
    deliveryLifecycleDetail?: DeliveryLifecycleDetail;
  } {
    // Filter for channel steps (exclude non-channel steps like trigger, delay, digest, custom)
    const channelSteps = jobs.filter(
      (job) => job.type && ['in_app', 'email', 'sms', 'chat', 'push'].includes(job.type)
    );

    if (channelSteps.length === 0) {
      return { deliveryLifecycleStatus: DeliveryLifecycleEnum.ERRORED, deliveryLifecycleDetail: DeliveryLifecycleDetail.WORKFLOW_MISSING_CHANNEL_STEP };
    }

    // Priority 1: SENT overrides everything - If any step is COMPLETED, workflow delivery lifecycle is SENT
    const hasCompletedSteps = channelSteps.some((job) => job.status === JobStatusEnum.COMPLETED);
    if (hasCompletedSteps) {
      return { deliveryLifecycleStatus: DeliveryLifecycleEnum.SENT };
    }

    // Priority 2: SKIPPED - Any job with SKIPPED status OR delivery lifecycle status is "skipped"
    const skippedJob = channelSteps.find(
      (job) => job.status === JobStatusEnum.SKIPPED ||
        (job.deliveryLifecycleState?.status && job.deliveryLifecycleState.status === 'skipped')
    );
    if (skippedJob) {
      return {
        deliveryLifecycleStatus: DeliveryLifecycleEnum.SKIPPED,
        deliveryLifecycleDetail: skippedJob.deliveryLifecycleState?.detail
      };
    }

    // Priority 3: CANCELED - Any job with CANCELED status (only if no SKIPPED found)
    const hasUserCanceled = channelSteps.some((job) => job.status === JobStatusEnum.CANCELED);
    if (hasUserCanceled) {
      return { deliveryLifecycleStatus: DeliveryLifecycleEnum.CANCELED };
    }

    // Priority 4: ERRORED - If any step has failed
    const hasFailedSteps = channelSteps.some((job) => job.status === JobStatusEnum.FAILED);
    if (hasFailedSteps) {
      return { deliveryLifecycleStatus: DeliveryLifecycleEnum.ERRORED };
    }

    // Priority 5: MERGED - If all steps are merged
    const allStepsMerged = channelSteps.every((job) => job.status === JobStatusEnum.MERGED);
    if (allStepsMerged) {
      return { deliveryLifecycleStatus: DeliveryLifecycleEnum.MERGED };
    }



    // Default fallback - if no clear status can be determined
    this.logger.warn(
      {
        jobIds: channelSteps.map((job) => job._id),
        statuses: channelSteps.map((job) => ({ status: job.status, deliveryLifecycleState: job.deliveryLifecycleState })),
      },
      'WorkflowRunDeliveryLifecycle: No matching delivery lifecycle found for jobs, falling back to ERRORED'
    );

    return { deliveryLifecycleStatus: DeliveryLifecycleEnum.ERRORED };
  }
}
